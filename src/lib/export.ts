import "server-only";
import type { FieldType, ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildReportWhere, STATUS_LABEL, STATUS_OPTIONS } from "@/lib/reports";

export const MAX_EXPORT_ROWS = 5000;
export const EXPORT_FORMATS = ["xlsx", "csv", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export class ExportTooLargeError extends Error {
  constructor(public total: number) {
    super(
      `Data terlalu banyak (${total} laporan, maksimal ${MAX_EXPORT_ROWS}). Persempit periode atau filter dulu.`
    );
  }
}

export type ExportFilters = {
  shiftId?: string;
  formId?: string;
  status?: ReportStatus;
  q?: string;
  from?: string;
  to?: string;
};

export type ExportCell =
  | { kind: "text"; text: string }
  | { kind: "number"; value: number }
  | { kind: "date"; value: Date }
  | { kind: "photos"; urls: string[] };

export type ExportColumn = { label: string; type: FieldType };

export type ExportRow = {
  id: string;
  shortId: string;
  reportDate: Date;
  submittedText: string;
  formName: string;
  reporter: string;
  shiftName: string;
  status: ReportStatus;
  statusLabel: string;
  cells: Record<string, ExportCell | undefined>;
};

export type ExportData = {
  generatedAtText: string;
  periodLabel: string;
  filterLines: string[];
  columns: ExportColumn[];
  rows: ExportRow[];
  total: number;
  byStatus: { label: string; count: number }[];
  byShift: { label: string; count: number }[];
  byForm: { label: string; count: number }[];
  numericTotals: { label: string; total: number }[];
  photoCount: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function validKey(s: string | null | undefined): string | undefined {
  if (!s || !DATE_RE.test(s)) return undefined;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : undefined;
}

function addDays(key: string, n: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function formatDateKey(d: Date) {
  const iso = d.toISOString();
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function formatWibDateTime(d: Date) {
  const w = new Date(d.getTime() + WIB_OFFSET_MS).toISOString();
  return `${w.slice(8, 10)}/${w.slice(5, 7)}/${w.slice(0, 4)} ${w.slice(11, 16)}`;
}

export function parseExportFilters(sp: URLSearchParams): ExportFilters {
  const statusParam = sp.get("status");
  const status = STATUS_OPTIONS.includes(statusParam as ReportStatus)
    ? (statusParam as ReportStatus)
    : undefined;

  let from = validKey(sp.get("from"));
  let to = validKey(sp.get("to"));
  if (from && to && from > to) [from, to] = [to, from];

  if (!from && !to) {
    const range = Number(sp.get("range"));
    if ([7, 14, 30].includes(range)) {
      to = new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(0, 10);
      from = addDays(to, -(range - 1));
    }
  }

  return {
    shiftId: sp.get("shift") || undefined,
    formId: sp.get("form") || undefined,
    status,
    q: sp.get("q")?.trim().slice(0, 60) || undefined,
    from,
    to,
  };
}

function countBy<T>(items: T[], key: (x: T) => string) {
  const m = new Map<string, number>();
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + 1);
  return [...m.entries()].map(([label, count]) => ({ label, count }));
}

export async function getExportData(f: ExportFilters): Promise<ExportData> {
  const where = buildReportWhere(f);
  const total = await prisma.report.count({ where });
  if (total > MAX_EXPORT_ROWS) throw new ExportTooLargeError(total);

  const [reports, forms, shift, form] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
      include: {
        form: { select: { id: true, name: true } },
        shift: { select: { name: true } },
        answers: true,
        files: { select: { fieldId: true, url: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.reportForm.findMany({
      orderBy: { createdAt: "asc" },
      include: { fields: { orderBy: { order: "asc" } } },
    }),
    f.shiftId ? prisma.shift.findUnique({ where: { id: f.shiftId } }) : null,
    f.formId ? prisma.reportForm.findUnique({ where: { id: f.formId } }) : null,
  ]);

  const presentForms = new Set(reports.map((r) => r.formId));
  const fieldById = new Map<string, { label: string; type: FieldType }>();
  const columns: ExportColumn[] = [];
  for (const fm of forms) {
    for (const fd of fm.fields) {
      fieldById.set(fd.id, { label: fd.label, type: fd.type });
      if (presentForms.has(fm.id) && !columns.some((c) => c.label === fd.label)) {
        columns.push({ label: fd.label, type: fd.type });
      }
    }
  }

  const rows: ExportRow[] = reports.map((r) => {
    const cells: Record<string, ExportCell | undefined> = {};

    for (const a of r.answers) {
      const fd = fieldById.get(a.fieldId);
      if (!fd) continue;
      if (a.valueNumber !== null) cells[fd.label] = { kind: "number", value: a.valueNumber };
      else if (a.valueText) cells[fd.label] = { kind: "text", text: a.valueText };
      else if (a.valueDate) cells[fd.label] = { kind: "date", value: a.valueDate };
      else if (Array.isArray(a.valueJson)) {
        cells[fd.label] = { kind: "text", text: a.valueJson.join(", ") };
      } else if (a.valueJson === true) cells[fd.label] = { kind: "text", text: "Ya" };
    }

    const urlsByLabel = new Map<string, string[]>();
    for (const file of r.files) {
      const fd = fieldById.get(file.fieldId);
      if (!fd) continue;
      urlsByLabel.set(fd.label, [...(urlsByLabel.get(fd.label) ?? []), file.url]);
    }
    for (const [label, urls] of urlsByLabel) cells[label] = { kind: "photos", urls };

    return {
      id: r.id,
      shortId: `#${r.id.slice(-6).toUpperCase()}`,
      reportDate: r.reportDate,
      submittedText: formatWibDateTime(r.createdAt),
      formName: r.form.name,
      reporter: r.reporterName,
      shiftName: r.shift.name,
      status: r.status,
      statusLabel: STATUS_LABEL[r.status],
      cells,
    };
  });

  const numericTotals = columns
    .filter((c) => c.type === "NUMBER")
    .map((c) => ({
      label: c.label,
      total: rows.reduce((sum, row) => {
        const cell = row.cells[c.label];
        return cell?.kind === "number" ? sum + cell.value : sum;
      }, 0),
    }));

  const filterLines: string[] = [];
  if (shift) filterLines.push(`Shift: ${shift.name}`);
  if (form) filterLines.push(`Jenis laporan: ${form.name}`);
  if (f.status) filterLines.push(`Status: ${STATUS_LABEL[f.status]}`);
  if (f.q) filterLines.push(`Pencarian: ${f.q}`);

  const periodLabel =
    f.from && f.to
      ? `${formatDateKey(new Date(`${f.from}T00:00:00Z`))} s/d ${formatDateKey(new Date(`${f.to}T00:00:00Z`))}`
      : f.from
        ? `Mulai ${formatDateKey(new Date(`${f.from}T00:00:00Z`))}`
        : f.to
          ? `Sampai ${formatDateKey(new Date(`${f.to}T00:00:00Z`))}`
          : "Semua tanggal";

  return {
    generatedAtText: `${formatWibDateTime(new Date())} WIB`,
    periodLabel,
    filterLines,
    columns,
    rows,
    total: rows.length,
    byStatus: STATUS_OPTIONS.map((s) => ({
      label: STATUS_LABEL[s],
      count: rows.filter((r) => r.status === s).length,
    })),
    byShift: countBy(rows, (r) => r.shiftName).sort((a, b) => a.label.localeCompare(b.label)),
    byForm: countBy(rows, (r) => r.formName).sort((a, b) => b.count - a.count),
    numericTotals,
    photoCount: reports.reduce((n, r) => n + r.files.length, 0),
  };
}
