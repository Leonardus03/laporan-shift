import "server-only";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatDateKey, type ExportCell, type ExportData } from "@/lib/export";

const BASE_HEADERS = [
  "No",
  "ID Laporan",
  "Tanggal Laporan",
  "Waktu Kirim (WIB)",
  "Jenis Laporan",
  "Pelapor",
  "Shift",
  "Status",
];

const STATUS_FILL: Record<string, string> = {
  Selesai: "FFD1FAE5",
  Ditolak: "FFFEE2E2",
  "Menunggu Review": "FFF1F5F9",
};

function cellForExcel(cell: ExportCell | undefined): string | number | Date | null {
  if (!cell) return null;
  switch (cell.kind) {
    case "number":
      return cell.value;
    case "date":
      return cell.value;
    case "text":
      return cell.text;
    case "photos":
      return cell.urls.join("\n");
  }
}

function cellForText(cell: ExportCell | undefined, photos: "urls" | "count"): string {
  if (!cell) return "";
  switch (cell.kind) {
    case "number":
      return String(cell.value);
    case "date":
      return formatDateKey(cell.value);
    case "text":
      return cell.text;
    case "photos":
      return photos === "urls" ? cell.urls.join(" | ") : `${cell.urls.length} foto`;
  }
}

// ---------------------------------------------------------------- Excel

export async function buildXlsx(data: ExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Laporan Shift";
  wb.created = new Date();

  const thin = { style: "thin" as const, color: { argb: "FFE2E8F0" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  // --- Sheet Laporan ---
  const ws = wb.addWorksheet("Laporan", { views: [{ state: "frozen", ySplit: 1 }] });
  const headers = [...BASE_HEADERS, ...data.columns.map((c) => c.label)];
  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = border;
  });

  const widths = headers.map((h) => Math.max(h.length + 2, 10));

  data.rows.forEach((r, i) => {
    const values = [
      i + 1,
      r.shortId,
      r.reportDate,
      r.submittedText,
      r.formName,
      r.reporter,
      r.shiftName,
      r.statusLabel,
      ...data.columns.map((c) => cellForExcel(r.cells[c.label])),
    ];
    const row = ws.addRow(values);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = border;
      cell.alignment = { vertical: "top", wrapText: true };
      const v = values[colNumber - 1];
      const len =
        v instanceof Date ? 10 : typeof v === "string" ? Math.max(...v.split("\n").map((l) => l.length)) : String(v ?? "").length;
      widths[colNumber - 1] = Math.min(Math.max(widths[colNumber - 1], len + 2), 48);
    });
    row.getCell(3).numFmt = "dd/mm/yyyy";
    const fill = STATUS_FILL[r.statusLabel];
    if (fill) {
      row.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    }
  });

  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };

  // --- Sheet Ringkasan ---
  const sum = wb.addWorksheet("Ringkasan");
  sum.getColumn(1).width = 36;
  sum.getColumn(2).width = 18;
  sum.addRow(["Laporan Shift"]).font = { bold: true, size: 16 };
  sum.addRow([`Dicetak: ${data.generatedAtText}`]);
  sum.addRow([`Periode: ${data.periodLabel}`]);
  data.filterLines.forEach((l) => sum.addRow([l]));
  sum.addRow([]);
  const totalRow = sum.addRow(["Total laporan", data.total]);
  totalRow.font = { bold: true };
  sum.addRow(["Total foto", data.photoCount]);

  const addBlock = (title: string, left: string, right: string, items: { a: string; b: number }[]) => {
    sum.addRow([]);
    const t = sum.addRow([title]);
    t.font = { bold: true, size: 12 };
    const h = sum.addRow([left, right]);
    h.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
      cell.border = border;
    });
    if (items.length === 0) {
      sum.addRow(["(tidak ada data)", ""]).eachCell((c) => (c.border = border));
    }
    items.forEach((it) => {
      sum.addRow([it.a, it.b]).eachCell((c) => (c.border = border));
    });
  };
  addBlock("Berdasarkan Status", "Status", "Jumlah", data.byStatus.map((x) => ({ a: x.label, b: x.count })));
  addBlock("Berdasarkan Shift", "Shift", "Jumlah", data.byShift.map((x) => ({ a: x.label, b: x.count })));
  addBlock("Berdasarkan Jenis Laporan", "Jenis Laporan", "Jumlah", data.byForm.map((x) => ({ a: x.label, b: x.count })));
  if (data.numericTotals.length > 0) {
    addBlock("Total Kolom Angka", "Kolom", "Total", data.numericTotals.map((x) => ({ a: x.label, b: x.total })));
  }

  // --- Sheet Foto ---
  if (data.photoCount > 0) {
    const fs = wb.addWorksheet("Foto", { views: [{ state: "frozen", ySplit: 1 }] });
    const fh = fs.addRow(["ID Laporan", "Jenis Laporan", "Pelapor", "Tanggal Laporan", "Kolom Foto", "Link Foto"]);
    fh.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
      cell.border = border;
    });
    const photoColumns = data.columns.filter((c) => c.type === "PHOTO");
    for (const r of data.rows) {
      for (const col of photoColumns) {
        const cell = r.cells[col.label];
        if (cell?.kind !== "photos") continue;
        for (const url of cell.urls) {
          const row = fs.addRow([r.shortId, r.formName, r.reporter, r.reportDate, col.label, { text: url, hyperlink: url }]);
          row.getCell(4).numFmt = "dd/mm/yyyy";
          row.getCell(6).font = { color: { argb: "FF2563EB" }, underline: true };
        }
      }
    }
    [14, 24, 22, 16, 22, 70].forEach((w, i) => {
      fs.getColumn(i + 1).width = w;
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------------------------------------------------------------- CSV

const CSV_SEPARATOR = ";";

// Cegah "formula injection" di Excel: teks yang diawali = + - @ diberi tanda petik.
function csvSafe(text: string) {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function csvEscape(text: string) {
  return /["\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(data: ExportData): string {
  const headers = [...BASE_HEADERS, ...data.columns.map((c) => c.label)];
  const lines = [headers.map(csvEscape).join(CSV_SEPARATOR)];

  data.rows.forEach((r, i) => {
    const fields = [
      String(i + 1),
      r.shortId,
      formatDateKey(r.reportDate),
      r.submittedText,
      csvSafe(r.formName),
      csvSafe(r.reporter),
      csvSafe(r.shiftName),
      r.statusLabel,
      ...data.columns.map((c) => {
        const cell = r.cells[c.label];
        const text = cellForText(cell, "urls");
        return cell?.kind === "number" ? text : csvSafe(text);
      }),
    ];
    lines.push(fields.map(csvEscape).join(CSV_SEPARATOR));
  });

  // BOM supaya Excel membaca UTF-8 dengan benar.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

// ---------------------------------------------------------------- PDF

const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 32;
const FONT_SIZE = 7.5;
const LINE_H = 10;

function makeSanitizer(font: PDFFont) {
  const cache = new Map<string, string>();
  return (text: string) =>
    [...text.replace(/\s+/g, " ").trim()]
      .map((ch) => {
        const hit = cache.get(ch);
        if (hit !== undefined) return hit;
        let out = ch;
        try {
          font.encodeText(ch);
        } catch {
          out = "?";
        }
        cache.set(ch, out);
        return out;
      })
      .join("");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (!word) continue;
    const trial = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
      line = trial;
      continue;
    }
    if (line) {
      out.push(line);
      line = "";
    }
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      line = word;
      continue;
    }
    let chunk = "";
    for (const ch of word) {
      if (chunk && font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
        out.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    line = chunk;
  }
  if (line) out.push(line);
  return out.length > 0 ? out : [""];
}

export async function buildPdf(data: ExportData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Laporan Shift");
  pdf.setCreator("Laporan Shift");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const clean = makeSanitizer(font);

  const usable = PAGE_W - MARGIN * 2;
  const fixed = [
    { title: "No", w: 26 },
    { title: "ID", w: 50 },
    { title: "Tanggal", w: 52 },
    { title: "Dikirim (WIB)", w: 70 },
    { title: "Jenis Laporan", w: 90 },
    { title: "Pelapor", w: 96 },
    { title: "Shift", w: 44 },
    { title: "Status", w: 66 },
  ];
  const noteW = usable - fixed.reduce((n, c) => n + c.w, 0);
  const cols = [...fixed, { title: "Catatan Operasional", w: noteW }];

  const pages: PDFPage[] = [];
  const addPage = () => {
    const p = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(p);
    return p;
  };

  let page = addPage();
  let y = PAGE_H - MARGIN;

  page.drawText("Laporan Shift", { x: MARGIN, y: y - 14, size: 18, font: bold, color: rgb(0.31, 0.27, 0.9) });
  y -= 30;

  const infoLines = [
    `Periode: ${data.periodLabel}`,
    ...data.filterLines,
    `Dicetak: ${data.generatedAtText}`,
    `Total: ${data.total} laporan   |   ${data.byStatus.map((s) => `${s.label}: ${s.count}`).join("   |   ")}   |   Foto: ${data.photoCount}`,
  ];
  if (data.numericTotals.length > 0) {
    infoLines.push(`Total angka: ${data.numericTotals.map((t) => `${t.label} ${t.total}`).join("; ")}`);
  }
  for (const raw of infoLines) {
    for (const l of wrapText(clean(raw), font, 9, usable)) {
      page.drawText(l, { x: MARGIN, y: y - 9, size: 9, font, color: rgb(0.2, 0.25, 0.33) });
      y -= 12;
    }
  }
  y -= 8;

  const drawHeader = (p: PDFPage, top: number) => {
    const h = 20;
    p.drawRectangle({ x: MARGIN, y: top - h, width: usable, height: h, color: rgb(0.31, 0.27, 0.9) });
    let x = MARGIN;
    for (const c of cols) {
      p.drawText(clean(c.title), { x: x + 3, y: top - 13.5, size: FONT_SIZE, font: bold, color: rgb(1, 1, 1) });
      x += c.w;
    }
    return top - h;
  };

  y = drawHeader(page, y);

  if (data.rows.length === 0) {
    page.drawText("Tidak ada data pada filter ini.", { x: MARGIN + 4, y: y - 16, size: 10, font, color: rgb(0.4, 0.45, 0.5) });
  }

  data.rows.forEach((r, i) => {
    const notes = data.columns
      .map((c) => {
        const cell = r.cells[c.label];
        if (!cell) return null;
        return `${c.label}: ${cellForText(cell, "count")}`;
      })
      .filter((x): x is string => x !== null)
      .join("; ");

    const texts = [
      String(i + 1),
      r.shortId,
      formatDateKey(r.reportDate),
      r.submittedText.slice(11) || r.submittedText,
      r.formName,
      r.reporter,
      r.shiftName,
      r.statusLabel,
      notes || "-",
    ].map(clean);

    const wrapped = texts.map((t, ci) => wrapText(t, font, FONT_SIZE, cols[ci].w - 6));
    const rowH = Math.max(...wrapped.map((w) => w.length)) * LINE_H + 8;

    if (y - rowH < MARGIN + 18) {
      page = addPage();
      y = drawHeader(page, PAGE_H - MARGIN);
    }

    if (i % 2 === 1) {
      page.drawRectangle({ x: MARGIN, y: y - rowH, width: usable, height: rowH, color: rgb(0.97, 0.98, 0.99) });
    }

    let x = MARGIN;
    wrapped.forEach((lines, ci) => {
      const color =
        ci === 7
          ? r.statusLabel === "Selesai"
            ? rgb(0.02, 0.45, 0.31)
            : r.statusLabel === "Ditolak"
              ? rgb(0.75, 0.1, 0.1)
              : rgb(0.35, 0.4, 0.46)
          : rgb(0.1, 0.13, 0.2);
      lines.forEach((l, li) => {
        page.drawText(l, { x: x + 3, y: y - 11 - li * LINE_H, size: FONT_SIZE, font: ci === 7 ? bold : font, color });
      });
      x += cols[ci].w;
    });

    page.drawLine({
      start: { x: MARGIN, y: y - rowH },
      end: { x: MARGIN + usable, y: y - rowH },
      thickness: 0.4,
      color: rgb(0.88, 0.91, 0.94),
    });
    y -= rowH;
  });

  const total = pages.length;
  pages.forEach((p, idx) => {
    p.drawText(`Laporan Shift  |  ${clean(data.generatedAtText)}`, {
      x: MARGIN,
      y: 16,
      size: 8,
      font,
      color: rgb(0.55, 0.6, 0.66),
    });
    const label = `Halaman ${idx + 1} dari ${total}`;
    p.drawText(label, {
      x: PAGE_W - MARGIN - font.widthOfTextAtSize(label, 8),
      y: 16,
      size: 8,
      font,
      color: rgb(0.55, 0.6, 0.66),
    });
  });

  return pdf.save();
}
