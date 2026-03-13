// generate-evidence-binder/index.ts
// Supabase Edge Function — generates annual AODA evidence binder
// Downloads all 12 monthly reports for a client, merges them with a cover page
// Trigger: cron Dec 1 01:00 UTC (after audit reports complete) OR manual POST
//
// Storage path: evidence/{CLIENT_CODE}/{YYYY}-binder.pdf

import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { getAdminClient } from "../_shared/supabase-admin.ts";
import {
  C, PW, PH, MARGIN, ACC, TIER_LABELS,
  loadFonts, drawText, drawRule, drawRect, drawSectionHeading,
  drawPageHeader, drawPageFooter, monthLabel,
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

  const now        = new Date();
  const year       = Number(body.year) || now.getFullYear();
  const targetCode = (body.client_code as string) || null;

  let query = sb
    .from("clients")
    .select("id, client_code, name, email, domain, tier, status, start_date, renewal_date")
    .eq("status", "active")
    .is("deleted_at", null);

  if (targetCode) query = query.eq("client_code", targetCode);

  const { data: clients, error: cErr } = await query;
  if (cErr) return new Response(JSON.stringify({ error: cErr.message }), { status: 500 });
  if (!clients?.length) {
    return new Response(JSON.stringify({ message: "No clients found" }), { status: 200 });
  }

  const results: Record<string, unknown> = {};

  for (const client of clients) {
    try {
      // ── Find available monthly reports ──────────────
      const { data: storageFiles } = await sb.storage
        .from("reports")
        .list(client.client_code, { limit: 100 });

      // Filter to files from the target year
      const yearFiles = (storageFiles || [])
        .filter((f) => f.name.startsWith(String(year) + "-") && f.name.endsWith(".pdf"))
        .sort((a, b) => a.name.localeCompare(b.name));

      // ── Download each monthly report ────────────────
      const monthlyPdfs: Array<{ month: number; bytes: Uint8Array }> = [];

      for (const file of yearFiles) {
        const mm    = parseInt(file.name.split("-")[1], 10);
        const path  = `${client.client_code}/${file.name}`;
        const { data: blob, error: dlErr } = await sb.storage
          .from("reports")
          .download(path);

        if (dlErr || !blob) continue;

        const bytes = new Uint8Array(await blob.arrayBuffer());
        monthlyPdfs.push({ month: mm, bytes });
      }

      // ── Build binder PDF ────────────────────────────
      const { data: milestones } = await sb
        .from("roadmap")
        .select("milestone, phase, target_date, status, year")
        .eq("client_id", client.id)
        .is("deleted_at", null)
        .order("target_date", { ascending: true });

      const pdfBytes = await buildBinder({
        client,
        year,
        monthlyPdfs,
        milestones: milestones || [],
      });

      // ── Upload ──────────────────────────────────────
      const path = `${client.client_code}/${year}-binder.pdf`;
      const { error: upErr } = await sb.storage
        .from("evidence")
        .upload(path, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      results[client.client_code] = upErr
        ? { status: "error", message: upErr.message }
        : { status: "ok", reports_merged: monthlyPdfs.length };

    } catch (e) {
      results[client.client_code] = { status: "error", message: (e as Error).message };
    }
  }

  return new Response(JSON.stringify({ year, results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

// ════════════════════════════════════════════════════════
// PDF BUILDER
// ════════════════════════════════════════════════════════
async function buildBinder(opts: {
  client: Record<string, unknown>;
  year: number;
  monthlyPdfs: Array<{ month: number; bytes: Uint8Array }>;
  milestones: Array<Record<string, unknown>>;
}): Promise<Uint8Array> {
  const { client, year, monthlyPdfs, milestones } = opts;

  const binder = await PDFDocument.create();
  binder.setTitle(`AODA Evidence Binder ${year} — ${client.name}`);
  binder.setAuthor(ACC.name);
  binder.setCreator("ACC Platform");

  const fonts = await loadFonts(binder);

  // Count total pages: cover (1) + TOC (1) + annual summary (1) + all monthly pages
  // We'll add cover + TOC + summary first, then merge monthly reports

  // ── COVER PAGE ─────────────────────────────────────────
  const cover = binder.addPage([PW, PH]);
  drawPageFooter(cover, fonts);

  // Full navy background
  drawRect(cover, 0, PH, PW, PH, C.navy);

  // Blue left stripe
  drawRect(cover, 0, PH, 8, PH, C.blue);

  // Large title
  cover.drawText("AODA", {
    x: MARGIN, y: PH - 120,
    font: fonts.bold, size: 52, color: C.blue,
  });
  cover.drawText("Evidence Binder", {
    x: MARGIN, y: PH - 175,
    font: fonts.bold, size: 28, color: C.white,
  });
  cover.drawText(String(year), {
    x: MARGIN, y: PH - 210,
    font: fonts.regular, size: 22, color: C.muted,
  });

  drawRule(cover, PH - 240, C.border, 1);

  cover.drawText(client.name as string, {
    x: MARGIN, y: PH - 270,
    font: fonts.bold, size: 18, color: C.white,
  });
  if (client.domain) {
    cover.drawText(client.domain as string, {
      x: MARGIN, y: PH - 294,
      font: fonts.regular, size: 12, color: C.blue,
    });
  }
  cover.drawText(`Client Code: ${client.client_code as string}`, {
    x: MARGIN, y: PH - 316,
    font: fonts.regular, size: 10, color: C.muted,
  });
  cover.drawText(TIER_LABELS[client.tier as number] || "", {
    x: MARGIN, y: PH - 334,
    font: fonts.regular, size: 10, color: C.muted,
  });

  // ACC branding bottom
  cover.drawText(ACC.name, {
    x: MARGIN, y: 120,
    font: fonts.bold, size: 11, color: C.offwhite,
  });
  cover.drawText(ACC.address + ", " + ACC.city, {
    x: MARGIN, y: 104,
    font: fonts.regular, size: 9, color: C.muted,
  });
  cover.drawText(ACC.email + "  |  " + ACC.phone, {
    x: MARGIN, y: 88,
    font: fonts.regular, size: 9, color: C.muted,
  });
  cover.drawText("Accessibility for Ontarians with Disabilities Act, 2005 — Ontario Regulation 191/11", {
    x: MARGIN, y: 68,
    font: fonts.oblique, size: 8, color: C.muted,
  });
  drawRule(cover, 58, C.border);
  cover.drawText("CONFIDENTIAL — PREPARED FOR CLIENT COMPLIANCE RECORDS", {
    x: MARGIN, y: 44,
    font: fonts.bold, size: 8, color: C.muted,
  });
  const genDate = "Generated: " + new Date().toLocaleDateString("en-CA");
  cover.drawText(genDate, {
    x: PW - MARGIN - fonts.regular.widthOfTextAtSize(genDate, 8), y: 44,
    font: fonts.regular, size: 8, color: C.muted,
  });

  // ── TABLE OF CONTENTS ──────────────────────────────────
  const toc = binder.addPage([PW, PH]);
  drawPageHeader(toc, fonts, "Table of Contents", String(year), 2, 99);
  drawPageFooter(toc, fonts);

  let cy = PH - 100;
  cy = drawSectionHeading(toc, "Contents", cy, fonts);
  cy -= 8;

  const tocEntries: Array<{ title: string; page: number }> = [
    { title: "Cover Page",         page: 1 },
    { title: "Table of Contents",  page: 2 },
    { title: "Annual Summary",     page: 3 },
  ];

  const MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  let reportStartPage = 4;
  for (const mp of monthlyPdfs) {
    tocEntries.push({
      title: `Monthly Audit Report — ${MONTH_NAMES[mp.month - 1]} ${year}`,
      page:  reportStartPage,
    });
    // Each monthly report is typically 2 pages
    reportStartPage += 2;
  }

  for (let i = 0; i < tocEntries.length; i++) {
    const entry  = tocEntries[i];
    const rowBg  = i % 2 === 0 ? { r: 0.06, g: 0.13, b: 0.24 } : { r: 0.039, g: 0.086, b: 0.157 };
    drawRect(toc, MARGIN, cy + 4, PW - MARGIN * 2, 20,
      require_rgb(rowBg.r, rowBg.g, rowBg.b));

    toc.drawText(entry.title, {
      x: MARGIN + 8, y: cy - 9,
      font: i < 3 ? fonts.bold : fonts.regular,
      size: 9, color: C.offwhite,
    });

    // Dot leader
    const numStr = String(entry.page);
    const numW   = fonts.regular.widthOfTextAtSize(numStr, 9);
    toc.drawText(numStr, {
      x: PW - MARGIN - numW - 8, y: cy - 9,
      font: fonts.regular, size: 9, color: C.muted,
    });

    cy -= 22;
  }

  // ── ANNUAL SUMMARY PAGE ────────────────────────────────
  const summary = binder.addPage([PW, PH]);
  drawPageHeader(summary, fonts, "Annual Compliance Summary", String(year), 3, 99);
  drawPageFooter(summary, fonts);

  let sy = PH - 100;

  // Milestone summary
  sy = drawSectionHeading(summary, "Roadmap Achievement — " + year, sy, fonts);
  sy -= 4;

  const yearMilestones = milestones.filter(
    (m) => String(m.year) === String(year) || !m.year
  );

  if (yearMilestones.length === 0) {
    drawRect(summary, MARGIN, sy + 4, PW - MARGIN * 2, 24, { ...C.navy });
    summary.drawText("No roadmap milestones recorded for this year.", {
      x: MARGIN + 8, y: sy - 9,
      font: fonts.regular, size: 9, color: C.muted,
    });
    sy -= 28;
  } else {
    const counts = { complete: 0, "in-progress": 0, planned: 0, overdue: 0 };
    const { normaliseStatus } = await import("../_shared/pdf-helpers.ts");
    for (const m of yearMilestones) {
      const s = normaliseStatus(m.status as string);
      counts[s] = (counts[s] || 0) + 1;
    }
    const pct = yearMilestones.length > 0
      ? Math.round((counts.complete / yearMilestones.length) * 100)
      : 0;

    // Big completion %
    summary.drawText(pct + "%", {
      x: MARGIN + 8, y: sy - 16,
      font: fonts.bold, size: 36, color: pct >= 75 ? C.teal : pct >= 40 ? C.warn : C.error,
    });
    summary.drawText("milestone completion rate for " + year, {
      x: MARGIN + 72, y: sy - 20,
      font: fonts.regular, size: 10, color: C.muted,
    });
    summary.drawText(
      `${counts.complete} of ${yearMilestones.length} milestones completed  ·  ` +
      `${counts["in-progress"]} in progress  ·  ${counts.overdue} overdue`,
      { x: MARGIN + 72, y: sy - 36, font: fonts.regular, size: 9, color: C.muted }
    );
    sy -= 60;
  }

  sy -= 10;

  // Reports coverage
  sy = drawSectionHeading(summary, "Monthly Reports Included in This Binder", sy, fonts);
  sy -= 4;

  const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const m    = allMonths[row * 4 + col];
      const has  = monthlyPdfs.some((mp) => mp.month === m);
      const cx   = MARGIN + col * 126;
      const rowH = 32;
      drawRect(summary, cx, sy + 4, 124, rowH,
        has ? require_rgb(0.04, 0.2, 0.15) : require_rgb(0.06, 0.13, 0.24));
      summary.drawText(MONTH_NAMES[m - 1], {
        x: cx + 8, y: sy - 8,
        font: fonts.bold, size: 9,
        color: has ? C.teal : C.muted,
      });
      summary.drawText(has ? "✓  Included" : "—  Not available", {
        x: cx + 8, y: sy - 22,
        font: fonts.regular, size: 8,
        color: has ? C.teal : C.muted,
      });
    }
    sy -= 36;
  }

  sy -= 16;

  // Closing statement
  drawRule(summary, sy, C.border);
  sy -= 18;
  summary.drawText(
    "This Evidence Binder serves as a record of AODA compliance activity under Ontario Regulation 191/11.",
    { x: MARGIN, y: sy, font: fonts.oblique, size: 8.5, color: C.muted }
  );
  sy -= 14;
  summary.drawText(
    "Prepared by " + ACC.name + "  ·  " + new Date().toLocaleDateString("en-CA"),
    { x: MARGIN, y: sy, font: fonts.regular, size: 8, color: C.muted }
  );

  // ── MERGE MONTHLY REPORTS ──────────────────────────────
  for (const mp of monthlyPdfs) {
    try {
      const monthDoc = await PDFDocument.load(mp.bytes);
      const pages    = await binder.copyPages(monthDoc, monthDoc.getPageIndices());
      for (const pg of pages) binder.addPage(pg);
    } catch {
      // If a monthly PDF is corrupt, add a placeholder page
      const errPage = binder.addPage([PW, PH]);
      drawPageHeader(errPage, fonts,
        "Report Unavailable",
        `${MONTH_NAMES[mp.month - 1]} ${year}`,
        0, 0
      );
      drawPageFooter(errPage, fonts);
      errPage.drawText(
        `The audit report for ${MONTH_NAMES[mp.month - 1]} ${year} could not be loaded.`,
        { x: MARGIN, y: PH / 2, font: fonts.regular, size: 11, color: C.error }
      );
    }
  }

  return await binder.save();
}

// Helper to avoid rgb import issues inside nested fn
function require_rgb(r: number, g: number, b: number) {
  return { r, g, b, type: "RGB" as const };
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
