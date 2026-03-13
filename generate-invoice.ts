// generate-invoice/index.ts
// Supabase Edge Function — generates monthly invoice PDF
// Triggers:
//   1. Stripe webhook POST with { type: "invoice.payment_succeeded", data: { object: { customer_email, ... } } }
//   2. Monthly cron fallback POST with { year?, month?, client_code? }
//   3. Manual POST with { client_code, year, month }
//
// Storage path: invoices/{CLIENT_CODE}/{YYYY}-{MM}-invoice.pdf

import { PDFDocument, rgb } from "npm:pdf-lib@1.17.1";
import { getAdminClient } from "../_shared/supabase-admin.ts";
import {
  C, PW, PH, MARGIN, ACC, TIER_LABELS, TIER_PRICES,
  loadFonts, drawText, drawRule, drawRect,
  drawPageHeader, drawPageFooter, drawSectionHeading,
  monthLabel, invoiceNumber,
} from "../_shared/pdf-helpers.ts";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey    = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const token      = authHeader.replace("Bearer ", "");
  if (token !== serviceKey && token !== anonKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sb = getAdminClient();

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }

  const now   = new Date();
  const year  = Number(body.year)  || now.getFullYear();
  const month = Number(body.month) || now.getMonth() + 1;

  // ── Stripe webhook path ───────────────────────────────
  // If Stripe event, extract customer email → look up client
  let targetCode: string | null = body.client_code as string || null;

  if (body.type === "invoice.payment_succeeded") {
    const obj   = (body.data as Record<string, unknown>)?.object as Record<string, unknown>;
    const email = (obj?.customer_email as string) || (obj?.customer as string);
    if (email) {
      const { data: cl } = await sb
        .from("clients")
        .select("client_code")
        .eq("email", email)
        .single();
      if (cl) targetCode = cl.client_code;
    }
  }

  // ── Fetch clients ─────────────────────────────────────
  let query = sb
    .from("clients")
    .select("id, client_code, name, email, domain, tier, status, billing_notes")
    .eq("status", "active")
    .is("deleted_at", null);

  if (targetCode) query = query.eq("client_code", targetCode);

  const { data: clients, error: cErr } = await query;
  if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500 });
  if (!clients || clients.length === 0) {
    return new Response(JSON.stringify({ message: "No clients found" }), { status: 200 });
  }

  const results: Record<string, string> = {};

  for (const client of clients) {
    try {
      // Fetch billing record for this month if it exists
      const { data: billingRow } = await sb
        .from("billing")
        .select("amount, currency, invoice_notes, paid_at")
        .eq("client_id", client.id)
        .gte("created_at", `${year}-${String(month).padStart(2, "0")}-01`)
        .lt("created_at",  `${year}-${String(month + 1).padStart(2, "0")}-01`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const pdfBytes = await buildInvoice({
        client,
        billingRow: billingRow || null,
        year,
        month,
      });

      const mm   = String(month).padStart(2, "0");
      const path = `${client.client_code}/${year}-${mm}-invoice.pdf`;

      const { error: upErr } = await sb.storage
        .from("invoices")
        .upload(path, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (upErr) {
        results[client.client_code] = "upload_error: " + upErr.message;
      } else {
        // Log to billing table if no row exists yet
        if (!billingRow) {
          const price = TIER_PRICES[client.tier as number] || 0;
          await sb.from("billing").insert({
            client_id:      client.id,
            amount:         price,
            currency:       "CAD",
            cycle:          "monthly",
            invoice_notes:  `Auto-generated ${year}-${mm}`,
          });
        }
        results[client.client_code] = "ok";
      }
    } catch (e) {
      results[client.client_code] = "error: " + (e as Error).message;
    }
  }

  return new Response(JSON.stringify({ year, month, results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

// ════════════════════════════════════════════════════════
// PDF BUILDER
// ════════════════════════════════════════════════════════
async function buildInvoice(opts: {
  client: Record<string, unknown>;
  billingRow: Record<string, unknown> | null;
  year: number;
  month: number;
}): Promise<Uint8Array> {
  const { client, billingRow, year, month } = opts;

  const doc = await PDFDocument.create();
  const invNum = invoiceNumber(client.client_code as string, year, month);
  doc.setTitle(`Invoice ${invNum} — ${client.name}`);
  doc.setAuthor(ACC.name);

  const fonts = await loadFonts(doc);
  const page  = doc.addPage([PW, PH]);

  drawPageHeader(page, fonts,
    "Invoice",
    `${invNum}  ·  ${monthLabel(year, month)}`,
    1, 1
  );
  drawPageFooter(page, fonts);

  let cy = PH - 90;

  // ── FROM / TO ──────────────────────────────────────────
  // Two columns: FROM (ACC) on left, TO (client) on right
  const col2x = MARGIN + 280;

  page.drawText("FROM", {
    x: MARGIN, y: cy,
    font: fonts.bold, size: 8, color: C.blue,
  });
  page.drawText("BILL TO", {
    x: col2x, y: cy,
    font: fonts.bold, size: 8, color: C.blue,
  });
  cy -= 16;

  const fromLines = [
    ACC.name,
    ACC.address,
    ACC.city,
    ACC.email,
    ACC.phone,
  ];
  const toLines = [
    client.name as string,
    client.email as string,
    (client.domain as string) || "",
    "",
    `Client Code: ${client.client_code as string}`,
  ];

  const lineH = 14;
  for (let i = 0; i < Math.max(fromLines.length, toLines.length); i++) {
    if (fromLines[i]) {
      page.drawText(fromLines[i], {
        x: MARGIN, y: cy,
        font: i === 0 ? fonts.bold : fonts.regular,
        size: 9,
        color: i === 0 ? C.offwhite : C.muted,
      });
    }
    if (toLines[i]) {
      page.drawText(toLines[i], {
        x: col2x, y: cy,
        font: i === 0 ? fonts.bold : fonts.regular,
        size: 9,
        color: i === 0 ? C.offwhite : C.muted,
      });
    }
    cy -= lineH;
  }

  cy -= 20;
  drawRule(page, cy, C.border);
  cy -= 24;

  // ── Invoice details block ──────────────────────────────
  const details = [
    ["Invoice Number", invNum],
    ["Invoice Date",   new Date().toLocaleDateString("en-CA")],
    ["Due Date",       getDueDate(year, month)],
    ["Period",         monthLabel(year, month)],
    ["Currency",       "CAD (Canadian Dollars)"],
  ];

  cy = drawSectionHeading(page, "Invoice Details", cy, fonts);
  cy -= 4;

  for (const [label, value] of details) {
    drawRect(page, MARGIN, cy + 4, PW - MARGIN * 2, 18,
      rgb(0.06, 0.13, 0.24));
    page.drawText(label, {
      x: MARGIN + 8, y: cy - 9,
      font: fonts.bold, size: 9, color: C.muted,
    });
    page.drawText(value, {
      x: MARGIN + 220, y: cy - 9,
      font: fonts.regular, size: 9, color: C.offwhite,
    });
    cy -= 20;
  }

  cy -= 20;

  // ── Line items ─────────────────────────────────────────
  cy = drawSectionHeading(page, "Services", cy, fonts);
  cy -= 4;

  // Table header
  drawRect(page, MARGIN, cy + 4, PW - MARGIN * 2, 16, C.navy);
  page.drawText("DESCRIPTION",   { x: MARGIN + 8,   y: cy - 7, font: fonts.bold, size: 8, color: C.blue });
  page.drawText("QTY",           { x: MARGIN + 340,  y: cy - 7, font: fonts.bold, size: 8, color: C.blue });
  page.drawText("UNIT PRICE",    { x: MARGIN + 370,  y: cy - 7, font: fonts.bold, size: 8, color: C.blue });
  page.drawText("AMOUNT",        { x: MARGIN + 448,  y: cy - 7, font: fonts.bold, size: 8, color: C.blue });
  cy -= 20;

  const tier      = client.tier as number;
  const basePrice = billingRow?.amount != null
    ? Number(billingRow.amount)
    : (TIER_PRICES[tier] || 0);
  const tierLabel = TIER_LABELS[tier] || "Accessibility Services";

  const lineItems = [
    {
      desc:  `AODA Compliance Services — ${tierLabel}`,
      qty:   1,
      price: basePrice,
    },
  ];

  if (client.billing_notes) {
    lineItems.push({
      desc:  client.billing_notes as string,
      qty:   1,
      price: 0,
    });
  }

  let subtotal = 0;
  let rowNum   = 0;

  for (const item of lineItems) {
    const rowBg = rowNum % 2 === 0
      ? rgb(0.06, 0.13, 0.24)
      : C.navy;
    drawRect(page, MARGIN, cy + 4, PW - MARGIN * 2, 20, rowBg);

    let desc = item.desc;
    if (desc.length > 55) desc = desc.slice(0, 53) + "…";

    page.drawText(desc, {
      x: MARGIN + 8, y: cy - 9,
      font: fonts.regular, size: 8.5, color: C.offwhite,
    });
    page.drawText(String(item.qty), {
      x: MARGIN + 344, y: cy - 9,
      font: fonts.regular, size: 8.5, color: C.muted,
    });
    page.drawText(item.price > 0 ? `$${item.price.toFixed(2)}` : "—", {
      x: MARGIN + 370, y: cy - 9,
      font: fonts.regular, size: 8.5, color: C.muted,
    });
    page.drawText(item.price > 0 ? `$${(item.qty * item.price).toFixed(2)}` : "—", {
      x: MARGIN + 448, y: cy - 9,
      font: fonts.regular, size: 8.5, color: C.offwhite,
    });

    subtotal += item.qty * item.price;
    cy -= 22;
    rowNum++;
  }

  cy -= 10;
  drawRule(page, cy, C.border);
  cy -= 8;

  // ── Totals block ───────────────────────────────────────
  const hst   = parseFloat(ACC.hst);
  const tax   = subtotal * hst;
  const total = subtotal + tax;

  const totalsX     = MARGIN + 340;
  const totalsValX  = PW - MARGIN - 60;

  const totalsRows = [
    { label: "Subtotal",     value: `$${subtotal.toFixed(2)}`, bold: false },
    { label: "HST (13%)",    value: `$${tax.toFixed(2)}`,      bold: false },
    { label: "TOTAL DUE",    value: `$${total.toFixed(2)}`,    bold: true  },
  ];

  for (const row of totalsRows) {
    if (row.bold) {
      drawRect(page, totalsX - 8, cy + 6, PW - MARGIN - totalsX + 8, 20, C.blue);
    }
    page.drawText(row.label, {
      x: totalsX, y: cy - 8,
      font: row.bold ? fonts.bold : fonts.regular,
      size: row.bold ? 10 : 9,
      color: row.bold ? C.navy : C.muted,
    });
    const vw = (row.bold ? fonts.bold : fonts.regular).widthOfTextAtSize(row.value, row.bold ? 10 : 9);
    page.drawText(row.value, {
      x: PW - MARGIN - vw, y: cy - 8,
      font: row.bold ? fonts.bold : fonts.regular,
      size: row.bold ? 10 : 9,
      color: row.bold ? C.navy : C.offwhite,
    });
    cy -= row.bold ? 28 : 18;
  }

  cy -= 24;

  // ── Payment instructions ───────────────────────────────
  cy = drawSectionHeading(page, "Payment Information", cy, fonts);
  cy -= 4;

  const paymentLines = [
    "Payment is due within 30 days of invoice date.",
    "E-transfer: " + ACC.email,
    "Please include your invoice number in the transfer message.",
    "For billing inquiries contact: " + ACC.phone,
  ];

  for (const line of paymentLines) {
    drawRect(page, MARGIN, cy + 4, PW - MARGIN * 2, 16, rgb(0.06, 0.13, 0.24));
    page.drawText(line, {
      x: MARGIN + 8, y: cy - 7,
      font: fonts.regular, size: 8.5, color: C.muted,
    });
    cy -= 18;
  }

  return await doc.save();
}

function getDueDate(year: number, month: number): string {
  // 30 days from first of the month
  const d = new Date(year, month - 1, 1);
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString("en-CA");
}
