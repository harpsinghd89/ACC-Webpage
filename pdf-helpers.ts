// _shared/pdf-helpers.ts
// Shared PDF layout utilities using pdf-lib
// All dimensions in points (72pt = 1 inch)

import {
  PDFDocument,
  PDFPage,
  PDFFont,
  rgb,
  StandardFonts,
  degrees,
} from "npm:pdf-lib@1.17.1";

// ── ACC Brand colours ─────────────────────────────────────
export const C = {
  navy:    rgb(0.039, 0.086, 0.157),   // #0a1628
  blue:    rgb(0.310, 0.557, 0.969),   // #4f8ef7
  teal:    rgb(0.220, 0.851, 0.663),   // #38d9a9
  white:   rgb(1, 1, 1),
  offwhite:rgb(0.910, 0.929, 0.973),   // #e8edf8
  muted:   rgb(0.541, 0.608, 0.749),   // #8a9bbf
  border:  rgb(0.118, 0.227, 0.420),   // #1e3a6b
  warn:    rgb(0.961, 0.651, 0.137),   // #f5a623
  error:   rgb(0.941, 0.373, 0.373),   // #f05f5f
  green:   rgb(0.133, 0.820, 0.490),   // #22d17d
};

// ── Page size: Letter (612 × 792 pt) ─────────────────────
export const PW = 612;
export const PH = 792;
export const MARGIN = 48;

// ── ACC business info ─────────────────────────────────────
export const ACC = {
  name:    "Accessibility Compliance Canada Inc.",
  short:   "ACC",
  address: "2150 Winston Park Dr, Unit 203, PMB#3018",
  city:    "Oakville, ON  L6H 5V1",
  email:   "compliance@accessibilitycompliance.ca",
  phone:   "(647) 896-9132",
  hst:     "0.13",  // 13% HST
};

export const TIER_LABELS: Record<number, string> = {
  1: "Tier 1 — Essential",
  2: "Tier 2 — Professional",
  3: "Tier 3 — Enterprise",
};

export const TIER_PRICES: Record<number, number> = {
  1: 69,
  2: 199,
  3: 0,  // custom
};

// ── Font loader ───────────────────────────────────────────
export async function loadFonts(doc: PDFDocument) {
  const regular  = await doc.embedFont(StandardFonts.Helvetica);
  const bold     = await doc.embedFont(StandardFonts.HelveticaBold);
  const oblique  = await doc.embedFont(StandardFonts.HelveticaOblique);
  return { regular, bold, oblique };
}

// ── Text helper ───────────────────────────────────────────
export function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  opts: {
    font: PDFFont;
    size?: number;
    color?: ReturnType<typeof rgb>;
    maxWidth?: number;
  }
) {
  const { font, size = 11, color = C.offwhite, maxWidth } = opts;
  if (!maxWidth) {
    page.drawText(text, { x, y, font, size, color });
    return y;
  }
  // Word-wrap
  const words = text.split(" ");
  let line = "";
  let cy = y;
  const lineH = size * 1.45;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    const w = font.widthOfTextAtSize(test, size);
    if (w > maxWidth && line) {
      page.drawText(line, { x, y: cy, font, size, color });
      cy -= lineH;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) page.drawText(line, { x, y: cy, font, size, color });
  return cy - lineH;
}

// ── Horizontal rule ───────────────────────────────────────
export function drawRule(
  page: PDFPage,
  y: number,
  color = C.border,
  thickness = 0.5
) {
  page.drawLine({
    start: { x: MARGIN, y },
    end:   { x: PW - MARGIN, y },
    thickness,
    color,
  });
}

// ── Filled rectangle ──────────────────────────────────────
export function drawRect(
  page: PDFPage,
  x: number, y: number,
  w: number, h: number,
  color: ReturnType<typeof rgb>,
  borderColor?: ReturnType<typeof rgb>
) {
  page.drawRectangle({
    x, y: y - h, width: w, height: h,
    color,
    borderColor,
    borderWidth: borderColor ? 0.5 : 0,
  });
}

// ── Status badge (coloured pill) ─────────────────────────
export function drawBadge(
  page: PDFPage,
  text: string,
  x: number, y: number,
  font: PDFFont,
  status: "complete" | "in-progress" | "planned" | "overdue"
) {
  const colorMap = {
    "complete":    { bg: C.teal,  fg: C.navy },
    "in-progress": { bg: C.warn,  fg: C.navy },
    "planned":     { bg: C.muted, fg: C.navy },
    "overdue":     { bg: C.error, fg: C.white },
  };
  const { bg, fg } = colorMap[status] ?? colorMap["planned"];
  const w = font.widthOfTextAtSize(text, 7.5) + 10;
  drawRect(page, x, y + 2, w, 13, bg);
  page.drawText(text, { x: x + 5, y: y - 7, font, size: 7.5, color: fg });
}

// ── Page header (dark navy bar) ───────────────────────────
export function drawPageHeader(
  page: PDFPage,
  fonts: { bold: PDFFont; regular: PDFFont },
  title: string,
  subtitle: string,
  pageNum: number,
  totalPages: number
) {
  // Background bar
  drawRect(page, 0, PH, PW, 62, C.navy);
  // Blue accent strip
  drawRect(page, 0, PH, 4, 62, C.blue);

  page.drawText(ACC.short, {
    x: MARGIN, y: PH - 22,
    font: fonts.bold, size: 14, color: C.blue,
  });
  page.drawText(title, {
    x: MARGIN + 36, y: PH - 22,
    font: fonts.bold, size: 14, color: C.white,
  });
  page.drawText(subtitle, {
    x: MARGIN, y: PH - 40,
    font: fonts.regular, size: 9, color: C.muted,
  });
  // Page number
  const pnStr = `Page ${pageNum} of ${totalPages}`;
  const pnW = fonts.regular.widthOfTextAtSize(pnStr, 8);
  page.drawText(pnStr, {
    x: PW - MARGIN - pnW, y: PH - 35,
    font: fonts.regular, size: 8, color: C.muted,
  });
}

// ── Page footer ───────────────────────────────────────────
export function drawPageFooter(page: PDFPage, fonts: { regular: PDFFont }) {
  drawRule(page, 32, C.border);
  page.drawText(ACC.name + "  |  " + ACC.email + "  |  " + ACC.phone, {
    x: MARGIN, y: 18,
    font: fonts.regular, size: 7, color: C.muted,
  });
  const conf = "CONFIDENTIAL — FOR CLIENT USE ONLY";
  const cw = fonts.regular.widthOfTextAtSize(conf, 7);
  page.drawText(conf, {
    x: PW - MARGIN - cw, y: 18,
    font: fonts.regular, size: 7, color: C.muted,
  });
}

// ── Section heading row ───────────────────────────────────
export function drawSectionHeading(
  page: PDFPage,
  label: string,
  y: number,
  fonts: { bold: PDFFont }
) {
  drawRect(page, MARGIN, y + 4, PW - MARGIN * 2, 18, C.border);
  page.drawText(label.toUpperCase(), {
    x: MARGIN + 8, y: y - 9,
    font: fonts.bold, size: 8, color: C.blue,
  });
  return y - 26;
}

// ── Table header row ──────────────────────────────────────
export function drawTableHeader(
  page: PDFPage,
  cols: Array<{ label: string; x: number; width: number }>,
  y: number,
  fonts: { bold: PDFFont }
) {
  drawRect(page, MARGIN, y + 4, PW - MARGIN * 2, 16, C.navy);
  for (const col of cols) {
    page.drawText(col.label, {
      x: col.x, y: y - 7,
      font: fonts.bold, size: 8, color: C.blue,
    });
  }
  return y - 20;
}

// ── Milestone status normaliser ───────────────────────────
export function normaliseStatus(
  raw: string
): "complete" | "in-progress" | "planned" | "overdue" {
  const s = (raw || "").toLowerCase().replace(/[-_\s]/g, "");
  if (["complete","completed","done"].includes(s)) return "complete";
  if (["inprogress","active","ongoing"].includes(s)) return "in-progress";
  if (["overdue","late","missed"].includes(s)) return "overdue";
  return "planned";
}

// ── Month label helper ────────────────────────────────────
export function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString("en-CA", { month: "long", year: "numeric" });
}

// ── Invoice number generator ──────────────────────────────
export function invoiceNumber(
  clientCode: string,
  year: number,
  month: number
): string {
  const mm = String(month).padStart(2, "0");
  return `${year}-${mm}-${clientCode}`;
}
