// helcim-checkout/index.ts
// Handles:
//   1. Init checkout: POST { amount, tier, billingCycle, firstName, ... }
//      → returns { checkoutToken }
//   2. Payment success: POST { event:"payment.success", transactionId, authUserId, payload }
//      → creates client, sets up recurring (monthly OR annual), triggers invoice PDF
//   3. Recurring webhook: POST { eventType:"recurringTransaction.approved", customerCode, ... }
//      → logs billing, triggers invoice PDF

import { getAdminClient } from "../_shared/supabase-admin.ts";

const HELCIM_API = "https://api.helcim.com/v2";
function hHeaders() {
  return {
    "Content-Type": "application/json",
    "accept":       "application/json",
    "api-token":    Deno.env.get("HELCIM_API_TOKEN")!,
    "account-id":   Deno.env.get("HELCIM_ACCOUNT_ID")!,
  };
}

// Plan codes must be created in Helcim dashboard before first use
const PLANS: Record<string, { name: string; amount: number; planCode: string; frequency: string }> = {
  "1-monthly": { name: "ACC Essential — Monthly",    amount: 69,   planCode: "ACC-T1-MONTHLY", frequency: "monthly" },
  "2-monthly": { name: "ACC Professional — Monthly",  amount: 199,  planCode: "ACC-T2-MONTHLY", frequency: "monthly" },
  "1-annual":  { name: "ACC Essential — Annual",     amount: 690,  planCode: "ACC-T1-ANNUAL",  frequency: "annually" },
  "2-annual":  { name: "ACC Professional — Annual",   amount: 1990, planCode: "ACC-T2-ANNUAL",  frequency: "annually" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }});
  }

  const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: CORS });
  }

  // ── Route: post-payment success ──────────────────────────
  if (body.event === "payment.success") {
    try {
      return new Response(JSON.stringify(await handlePaymentSuccess(body)), { status: 200, headers: CORS });
    } catch (e) {
      console.error("handlePaymentSuccess:", e);
      return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: CORS });
    }
  }

  // ── Route: Helcim recurring webhook ──────────────────────
  if (body.eventType === "recurringTransaction.approved") {
    try {
      return new Response(JSON.stringify(await handleRecurring(body)), { status: 200, headers: CORS });
    } catch (e) {
      console.error("handleRecurring:", e);
      return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: CORS });
    }
  }

  // ── Route: initialize Helcim checkout ────────────────────
  const { amount, currency, tier, billingCycle, firstName, lastName,
          email, company, domain, phone, billingAddr } = body as Record<string, string | number>;

  if (!amount || !email) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: CORS });
  }

  try {
    const token = await initCheckout({
      amount:       Number(amount),
      currency:     (currency as string) || "CAD",
      tier:         Number(tier) || 1,
      billingCycle: (billingCycle as string) || "monthly",
      firstName:    (firstName as string) || "",
      lastName:     (lastName as string) || "",
      email:        email as string,
      company:      (company as string) || "",
      domain:       (domain as string) || "",
      phone:        (phone as string) || "",
      billingAddr:  (billingAddr as string) || "",
    });
    return new Response(JSON.stringify({ checkoutToken: token }), { status: 200, headers: CORS });
  } catch (e) {
    console.error("initCheckout:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: CORS });
  }
});

// ════════════════════════════════════════════════════════
// INIT CHECKOUT
// ════════════════════════════════════════════════════════
async function initCheckout(p: {
  amount: number; currency: string; tier: number; billingCycle: string;
  firstName: string; lastName: string; email: string;
  company: string; domain: string; phone: string; billingAddr: string;
}): Promise<string> {
  const planKey = `${p.tier}-${p.billingCycle}`;
  const plan    = PLANS[planKey] || PLANS["1-monthly"];

  const resp = await fetch(`${HELCIM_API}/helcim-pay/initialize`, {
    method:  "POST",
    headers: hHeaders(),
    body: JSON.stringify({
      paymentType:    "purchase",
      amount:          p.amount,
      currency:        p.currency,
      customerCode:    p.email,
      companyName:     p.company,
      customerName:   `${p.firstName} ${p.lastName}`,
      customerEmail:   p.email,
      comments:        `ACC ${plan.name} — ${p.domain || p.email}`,
      paymentMethod:   "cc",
      allowedPayments: ["cc"],
      billingAddress: {
        name:    `${p.firstName} ${p.lastName}`,
        company:  p.company,
        street1:  p.billingAddr,
        phone:    p.phone,
        email:    p.email,
      },
      notifyUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/helcim-checkout`,
    }),
  });

  if (!resp.ok) throw new Error(`Helcim init failed (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  if (!data.checkoutToken) throw new Error("No checkoutToken from Helcim: " + JSON.stringify(data));
  return data.checkoutToken as string;
}

// ════════════════════════════════════════════════════════
// HANDLE PAYMENT SUCCESS
// ════════════════════════════════════════════════════════
async function handlePaymentSuccess(body: Record<string, unknown>) {
  const sb      = getAdminClient();
  const payload = body.payload as Record<string, unknown>;
  const tier    = Number(payload.tier) || 1;
  const cycle   = (payload.billingCycle as string) || "monthly";
  const isAnnual = cycle === "annual";
  const planKey  = `${tier}-${cycle}`;
  const plan     = PLANS[planKey] || PLANS["1-monthly"];

  const clientCode  = await genClientCode(sb);
  const now         = new Date();
  const renewalDate = new Date(now);
  renewalDate.setMonth(renewalDate.getMonth() + (isAnnual ? 12 : 1));

  const { data: newClient, error: insertErr } = await sb
    .from("clients")
    .insert({
      auth_user_id:     (body.authUserId as string) || null,
      client_code:      clientCode,
      name:            `${payload.firstName} ${payload.lastName}`,
      email:            payload.email as string,
      phone:           (payload.phone as string) || null,
      domain:          (payload.domain as string) || null,
      tier,
      status:           "active",
      start_date:       now.toISOString().split("T")[0],
      renewal_date:     renewalDate.toISOString().split("T")[0],
      onboarding_notes:`Self-serve ${cycle} signup. Company: ${payload.company || "—"}`,
    })
    .select("id, client_code")
    .single();

  if (insertErr) throw new Error("Client insert failed: " + insertErr.message);

  // Billing record
  const base     = plan.amount;
  const discount = Number(payload.discountPct || 0);
  const net      = base * (1 - discount);
  const hst      = net * 0.13;
  await sb.from("billing").insert({
    client_id:      newClient.id,
    amount:         net + hst,
    currency:       "CAD",
    cycle:          cycle,
    payment_method: "helcim",
    invoice_notes:  discount > 0
      ? `${Math.round(discount*100)}% discount (code: ${payload.discountCode || "—"})`
      : `Initial ${cycle} subscription`,
    paid_at: now.toISOString(),
  });

  // Default roadmap
  const milestones = buildMilestones(newClient.id, tier, now);
  if (milestones.length) await sb.from("roadmap").insert(milestones);

  // Template access
  const templates = tier === 1
    ? ["accessibility-policy"]
    : ["accessibility-policy","emergency-response","service-animal","disruption-notice"];
  await sb.from("template_access").insert(
    templates.map((t) => ({ client_id: newClient.id, template_key: t, enabled: true }))
  );

  // Set up Helcim recurring (both monthly AND annual auto-renew)
  try {
    await setupRecurring({ clientCode, email: payload.email as string,
      firstName: payload.firstName as string, lastName: payload.lastName as string,
      company: payload.company as string, tier, cycle,
      transactionId: body.transactionId as string });
  } catch (e) {
    console.error("Helcim recurring setup failed:", e);
    await sb.from("audit_log").insert({
      client_id: newClient.id, actor_type: "system",
      action: "helcim_recurring_setup_failed",
      new_value: { error: (e as Error).message, cycle },
    });
  }

  // Trigger invoice PDF
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ client_code: clientCode,
        year: now.getFullYear(), month: now.getMonth() + 1 }),
    });
  } catch (e) { console.error("Invoice gen failed:", e); }

  await sb.from("audit_log").insert({
    client_id: newClient.id, actor_type: "client", action: "self_serve_signup",
    new_value: { tier, cycle, transactionId: body.transactionId, domain: payload.domain },
  });

  return { ok: true, clientCode };
}

// ════════════════════════════════════════════════════════
// HANDLE RECURRING TRANSACTION WEBHOOK
// ════════════════════════════════════════════════════════
async function handleRecurring(body: Record<string, unknown>) {
  const sb           = getAdminClient();
  const customerCode = (body.customerCode as string) || (body.customerEmail as string);
  if (!customerCode) throw new Error("No customerCode in recurring webhook");

  const { data: client } = await sb.from("clients")
    .select("id, client_code, tier, billing(cycle)")
    .eq("email", customerCode)
    .single();

  if (!client) { console.error("Unknown customer:", customerCode); return { ok: false }; }

  // Determine cycle from latest billing record
  const cycle    = (client as Record<string,unknown>).billing?.[0]?.cycle || "monthly";
  const planKey  = `${client.tier}-${cycle}`;
  const plan     = PLANS[planKey] || PLANS["1-monthly"];
  const now      = new Date();

  await sb.from("billing").insert({
    client_id:      client.id,
    amount:         plan.amount * 1.13,
    currency:       "CAD",
    cycle:          cycle,
    payment_method: "helcim_recurring",
    invoice_notes:  `Auto-renew ${cycle} ${now.toISOString().substring(0,7)}`,
    paid_at:        now.toISOString(),
  });

  // Update renewal date
  const renewalDate = new Date(now);
  renewalDate.setMonth(renewalDate.getMonth() + (cycle === "annual" ? 12 : 1));
  await sb.from("clients").update({ renewal_date: renewalDate.toISOString().split("T")[0] })
    .eq("id", client.id);

  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ client_code: client.client_code,
        year: now.getFullYear(), month: now.getMonth() + 1 }),
    });
  } catch (e) { console.error("Invoice gen failed:", e); }

  return { ok: true, clientCode: client.client_code };
}

// ════════════════════════════════════════════════════════
// SETUP RECURRING (monthly or annual — both auto-renew)
// ════════════════════════════════════════════════════════
async function setupRecurring(p: {
  clientCode: string; email: string; firstName: string; lastName: string;
  company: string; tier: number; cycle: string; transactionId: string;
}) {
  const planKey = `${p.tier}-${p.cycle}`;
  const plan    = PLANS[planKey] || PLANS["1-monthly"];
  const today   = new Date();

  // Create/update Helcim customer
  const custResp = await fetch(`${HELCIM_API}/customers`, {
    method: "POST", headers: hHeaders(),
    body: JSON.stringify({ customerCode: p.email, firstName: p.firstName,
      lastName: p.lastName, companyName: p.company, email: p.email }),
  });
  if (!custResp.ok) throw new Error(`Helcim customer create failed: ${await custResp.text()}`);
  const custData = await custResp.json();

  // Create subscription
  const recurResp = await fetch(`${HELCIM_API}/recurring/subscriptions`, {
    method: "POST", headers: hHeaders(),
    body: JSON.stringify({
      planCode:        plan.planCode,
      customerCode:    custData.customerCode || p.email,
      startDate:       today.toISOString().split("T")[0],
      recurringAmount: plan.amount,
      currency:        "CAD",
      frequency:       plan.frequency,   // "monthly" or "annually"
      billingDay:      today.getDate(),  // same day each month/year
      comments:        `ACC ${plan.name} — ${p.clientCode}`,
      notifyUrl:       `${Deno.env.get("SUPABASE_URL")}/functions/v1/helcim-checkout`,
    }),
  });
  if (!recurResp.ok) throw new Error(`Helcim recurring failed: ${await recurResp.text()}`);
  return await recurResp.json();
}

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════
async function genClientCode(sb: ReturnType<typeof getAdminClient>): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 10; i++) {
    let s = "";
    for (let j = 0; j < 5; j++) s += chars[Math.floor(Math.random() * chars.length)];
    const code = "CLI-" + s;
    const { data } = await sb.from("clients").select("id").eq("client_code", code).single();
    if (!data) return code;
  }
  throw new Error("Could not generate unique client code");
}

function buildMilestones(clientId: string, tier: number, now: Date) {
  const year = now.getFullYear();
  const add  = (m: number) => { const d = new Date(now); d.setMonth(d.getMonth()+m); return d.toISOString().split("T")[0]; };
  const base = [
    { milestone:"Widget installation & verification",        phase:"Setup",       target_date:add(0),  status:"planned" },
    { milestone:"Accessibility Policy published on website", phase:"Policy",      target_date:add(1),  status:"planned" },
    { milestone:"Staff AODA awareness training completed",   phase:"Training",    target_date:add(2),  status:"planned" },
    { milestone:"Initial AODA compliance audit",             phase:"Audit",       target_date:add(2),  status:"planned" },
    { milestone:"Remediation plan drafted",                  phase:"Remediation", target_date:add(3),  status:"planned" },
    { milestone:"AODA multi-year plan filed (if applicable)",phase:"Filing",      target_date:add(6),  status:"planned" },
  ];
  const t2extra = [
    { milestone:"Customer Feedback mechanism activated",   phase:"Feedback",  target_date:add(1),  status:"planned" },
    { milestone:"Emergency Response plan completed",       phase:"Policy",    target_date:add(3),  status:"planned" },
    { milestone:"Service Animal policy published",         phase:"Policy",    target_date:add(3),  status:"planned" },
    { milestone:"Annual evidence binder compiled",         phase:"Evidence",  target_date:add(12), status:"planned" },
  ];
  return (tier >= 2 ? [...base, ...t2extra] : base).map((m) => ({ ...m, client_id: clientId, year }));
}
