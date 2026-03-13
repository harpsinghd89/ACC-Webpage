// generate-audit-report/index.ts
// Supabase Edge Function — generates monthly AODA audit report PDF
// Trigger: cron (Dec 1 00:00 UTC) OR manual POST with { client_code?, year?, month? }
//
// Storage path: reports/{CLIENT_CODE}/{YYYY}-{MM}.pdf

import { PDFDocument, rgb } from "npm:pdf-lib@1.17.1";
import { getAdminClient } from "../_shared/supabase-admin.ts";
import {
  C, PW, PH, MARGIN, ACC, TIER_LABELS,
  loadFonts, drawText, drawRule, drawRect,
  drawPageHeader, drawPageFooter, drawSectionHeading,
  drawTableHeader, drawBadge, normaliseStatus, monthLabel,
} from "../_shared/pdf-helpers.ts";

Deno.serve(async (req) => {
  // ── Auth check (cron calls or admin calls only) ───────
  const authHeader = req.headers.get("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey    = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const token      = authHeader.replace("Bearer ", "");
  if (token !== serviceKey && token !== anonKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sb = getAdminClient();

  // ── Parse request ─────────────────────────────────────
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* cron sends empty body */ }

  const now   = new Date();
  const year  = Number(body.year)  || now.getFullYear();
  const month = Number(body.month) || now.getMonth() + 1; // 1-12
  const targetCode = (body.client_code as string) || null;

  // ── Fetch clients ─────────────────────────────────────
  let query = sb
    .from("clients")
    .select("id, client_code, name, email, domain, tier, status, start_date, renewal_date")
    .eq("status", "active")
    .is("deleted_at", null);

  if (targetCode) query = query.eq("client_code", targetCode);

  const { data: clients, error: cErr } = await query;
  if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500 });
  if (!clients || clients.length === 0) {
    return new Response(JSON.stringify({ message: "No active clients found" }), { status: 200 });
  }

  const results: Record<string, string> = {};

  for (const client of clients) {
    try {
      // ── Fetch roadmap ───────────────────────────────
      const { data: milestones } = await sb
        .from("roadmap")
        .select("milestone, phase, target_date, status, year")
        .eq("client_id", client.id)
        .is("deleted_at", null)
        .order("target_date", { ascending: true });

      // ── Build PDF ───────────────────────────────────
      const pdfBytes = await buildAuditReport({
        client,
        milestones: milestones || [],
        year,
        month,
      });

      // ── Upload to storage ───────────────────────────
      const mm   = String(month).padStart(2, "0");
      const path = `${client.client_code}/${year}-${mm}.pdf`;

      const { error: upErr } = await sb.storage
        .from("reports")
        .upload(path, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (upErr) {
        results[client.client_code] = "upload_error: " + upErr.message;
      } else {
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
async function buildAuditReport(opts: {
  client: Record<string, unknown>;
  milestones: Array<Record<string, unknown>>;
  year: number;
  month: number;
}): Promise<Uint8Array> {
  const { client, milestones, year, month } = opts;

  const doc   = await PDFDocument.create();
  doc.setTitle(`AODA Audit Report — ${client.name} — ${monthLabel(year, month)}`);
  doc.setAuthor(ACC.name);
  doc.setCreator("ACC Platform");

  const fonts      = await loadFonts(doc);
  const totalPages = milestones.length > 0 ? 2 : 1;

  // ── PAGE 1: Cover + Summary ───────────────────────────
  const p1 = doc.addPage([PW, PH]);
  drawPageHeader(p1, fonts,
    "AODA Audit Report",
    `${monthLabel(year, month)}  ·  ${client.client_code as string}`,
    1, totalPages
  );
  drawPageFooter(p1, fonts);

  // Large navy background for cover area
  drawRect(p1, 0, PH - 62, PW, PH - 62 - 200, C.navy);

  // Client name
  p1.drawText(client.name as string, {
    x: MARGIN, y: PH - 110,
    font: fonts.bold, size: 22, color: C.white,
  });

  // Domain
  if (client.domain) {
    p1.drawText(client.domain as string, {
      x: MARGIN, y: PH - 136,
      font: fonts.regular, size: 11, color: C.blue,
    });
  }

  // Tier badge
  const tierStr = TIER_LABELS[client.tier as number] || "Unknown Tier";
  p1.drawText(tierStr, {
    x: MARGIN, y: PH - 158,
    font: fonts.regular, size: 10, color: C.muted,
  });

  // Report period
  const periodStr = `Reporting Period:  ${monthLabel(year, month)}`;
  p1.drawText(periodStr, {
    x: MARGIN, y: PH - 176,
    font: fonts.regular, size: 10, color: C.muted,
  });

  // Divider after cover area
  let cy = PH - 280;
  drawRule(p1, cy, C.border);
  cy -= 24;

  // ── Summary section ────────────────────────────────
  cy = drawSectionHeading(p1, "Account Summary", cy, fonts);
  cy -= 4;

  const summaryRows = [
    ["Client Code",    client.client_code as string],
    ["Service Tier",   tierStr],
    ["Domain",         (client.domain as string) || "Not on file"],
    ["Start Date",     (client.start_date as string) || "—"],
    ["Renewal Date",   (client.renewal_date as string) || "—"],
    ["Report Date",    new Date().toLocaleDateString("en-CA")],
  ];

  for (const [label, value] of summaryRows) {
    drawRect(p1, MARGIN, cy + 4, PW - MARGIN * 2, 18,
      cy % 36 === 0 ? rgb(0.06, 0.13, 0.24) : C.navy);
    p1.drawText(label, {
      x: MARGIN + 8, y: cy - 9,
      font: fonts.bold, size: 9, color: C.muted,
    });
    p1.drawText(value, {
      x: MARGIN + 180, y: cy - 9,
      font: fonts.regular, size: 9, color: C.offwhite,
    });
    cy -= 20;
  }

  cy -= 14;

  // ── Widget install status ──────────────────────────
  cy = drawSectionHeading(p1, "Widget Installation Status", cy, fonts);
  cy -= 4;

  const widgetInstalled = !!(client.domain);
  const widgetStatus    = widgetInstalled
    ? "Domain on file — widget deployment assumed active"
    : "No domain on file — widget installation unconfirmed";
  const widgetColor = widgetInstalled ? C.teal : C.warn;
  const widgetMark  = widgetInstalled ? "✓" : "⚠";

  drawRect(p1, MARGIN, cy + 4, PW - MARGIN * 2, 36, rgb(0.06, 0.13, 0.24));
  p1.drawText(widgetMark, {
    x: MARGIN + 10, y: cy - 8,
    font: fonts.bold, size: 14, color: widgetColor,
  });
  drawText(p1, widgetStatus, MARGIN + 32, cy - 6, {
    font: fonts.regular, size: 9, color: C.offwhite,
    maxWidth: PW - MARGIN * 2 - 44,
  });

  const cdn = "https://cdn.jsdelivr.net/gh/accessibilitycompliance/ACC-Widget@main/ACC-Widget.js";
  drawText(p1, "Widget CDN:  " + cdn, MARGIN + 32, cy - 20, {
    font: fonts.regular, size: 7.5, color: C.muted,
    maxWidth: PW - MARGIN * 2 - 44,
  });
  cy -= 48;

  // ── Milestone summary counts ───────────────────────
  if (milestones.length > 0) {
    cy -= 8;
    cy = drawSectionHeading(p1, "Roadmap Progress Overview", cy, fonts);
    cy -= 4;

    const counts = { complete: 0, "in-progress": 0, planned: 0, overdue: 0 };
    for (const m of milestones) {
      const s = normaliseStatus(m.status as string);
      counts[s] = (counts[s] || 0) + 1;
    }
    const total = milestones.length;

    const statCols = [
      { label: "Total",       value: String(total),              color: C.offwhite },
      { label: "Complete",    value: String(counts.complete),    color: C.teal },
      { label: "In Progress", value: String(counts["in-progress"]), color: C.warn },
      { label: "Planned",     value: String(counts.planned),     color: C.muted },
      { label: "Overdue",     value: String(counts.overdue),     color: C.error },
    ];

    const colW = (PW - MARGIN * 2) / statCols.length;
    for (let i = 0; i < statCols.length; i++) {
      const col = statCols[i];
      const cx  = MARGIN + i * colW;
      drawRect(p1, cx, cy + 4, colW - 2, 46,
        i % 2 === 0 ? rgb(0.06, 0.13, 0.24) : C.navy);
      p1.drawText(col.value, {
        x: cx + 8, y: cy - 12,
        font: fonts.bold, size: 18, color: col.color,
      });
      p1.drawText(col.label, {
        x: cx + 8, y: cy - 28,
        font: fonts.regular, size: 8, color: C.muted,
      });
    }
    cy -= 56;
  }

  // ── Compliance note ────────────────────────────────
  cy -= 10;
  drawRule(p1, cy, C.border);
  cy -= 18;
  p1.drawText("AODA — Accessibility for Ontarians with Disabilities Act, 2005", {
    x: MARGIN, y: cy,
    font: fonts.oblique, size: 8, color: C.muted,
  });
  cy -= 13;
  p1.drawText(
    "This report is prepared by " + ACC.name + " and is confidential. " +
    "Compliance status is based on information provided to ACC.",
    { x: MARGIN, y: cy, font: fonts.regular, size: 7.5, color: C.muted }
  );

  // ── PAGE 2: Full Roadmap Table ─────────────────────
  if (milestones.length > 0) {
    const p2  = doc.addPage([PW, PH]);
    const mm2 = String(month).padStart(2, "0");
    drawPageHeader(p2, fonts,
      "Roadmap — Full Milestone Detail",
      `${monthLabel(year, month)}  ·  ${client.client_code as string}`,
      2, totalPages
    );
    drawPageFooter(p2, fonts);

    const cols = [
      { label: "MILESTONE",   x: MARGIN + 8,   width: 220 },
      { label: "PHASE",       x: MARGIN + 232,  width: 90  },
      { label: "TARGET DATE", x: MARGIN + 326,  width: 90  },
      { label: "STATUS",      x: MARGIN + 418,  width: 90  },
    ];

    let ry = PH - 90;
    ry = drawTableHeader(p2, cols, ry, fonts);

    let rowNum = 0;
    for (const m of milestones) {
      if (ry < 80) break; // safety — won't paginate further (binder handles multi-page)

      const rowBg = rowNum % 2 === 0
        ? rgb(0.06, 0.13, 0.24)
        : C.navy;

      drawRect(p2, MARGIN, ry + 4, PW - MARGIN * 2, 20, rowBg);

      // Milestone name (truncate if long)
      let mName = (m.milestone as string) || "";
      if (mName.length > 38) mName = mName.slice(0, 36) + "…";
      p2.drawText(mName, {
        x: cols[0].x, y: ry - 10,
        font: fonts.regular, size: 8.5, color: C.offwhite,
      });

      p2.drawText((m.phase as string) || "—", {
        x: cols[1].x, y: ry - 10,
        font: fonts.regular, size: 8.5, color: C.muted,
      });

      p2.drawText((m.target_date as string) || "—", {
        x: cols[2].x, y: ry - 10,
        font: fonts.regular, size: 8.5, color: C.muted,
      });

      // Status badge
      const status = normaliseStatus(m.status as string);
      const label  = status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
      drawBadge(p2, label, cols[3].x, ry - 2, fonts.bold, status);

      ry -= 22;
      rowNum++;
    }
  }

  return await doc.save();
}
