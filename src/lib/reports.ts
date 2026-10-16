import "server-only";
import type { Prisma, ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PAGE_SIZE = 10;
export const STATUS_OPTIONS: ReportStatus[] = ["SUBMITTED", "REVIEWED", "REJECTED"];

export type ReportFilters = {
  shiftId?: string;
  formId?: string;
  status?: ReportStatus;
  q?: string;
  page: number;
};

export function formatWibTime(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  })
    .format(d)
    .replace(".", ":");
}

export function formatWibDateTime(d: Date) {
  const date = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
  return `${date} ${formatWibTime(d)} WIB`;
}

function formatDateKey(d: Date) {
  const iso = d.toISOString();
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export async function getReportTable(f: ReportFilters) {
  const q = f.q?.replace(/^#/, "").trim();
  const where: Prisma.ReportWhereInput = {
    ...(f.shiftId ? { shiftId: f.shiftId } : {}),
    ...(f.formId ? { formId: f.formId } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(q
      ? {
          OR: [
            { reporterName: { contains: q, mode: "insensitive" } },
            { id: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, found] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        form: { select: { id: true, name: true } },
        shift: { select: { name: true } },
        answers: {
          include: { field: { select: { label: true, type: true, order: true } } },
        },
        _count: { select: { files: true } },
      },
    }),
  ]);

  const rows = found.map((r) => {
    const parts = r.answers
      .filter((a) => a.field.type !== "PHOTO")
      .sort((a, b) => a.field.order - b.field.order)
      .map((a) => {
        const v = a.valueNumber ?? a.valueText;
        return v === null || v === "" ? null : `${a.field.label}: ${v}`;
      })
      .filter((x): x is string => x !== null);
    if (r._count.files > 0) parts.push(`${r._count.files} foto`);

    return {
      id: r.id,
      shortId: `#${r.id.slice(-6).toUpperCase()}`,
      time: formatWibTime(r.createdAt),
      reportDate: `${r.reportDate.toISOString().slice(8, 10)}/${r.reportDate
        .toISOString()
        .slice(5, 7)}`,
      shiftName: r.shift.name,
      formId: r.form.id,
      formName: r.form.name,
      reporterName: r.reporterName,
      status: r.status,
      summary: parts.length ? parts.join(" · ") : "—",
    };
  });

  return { total, rows };
}

export type ReportDetailField = {
  id: string;
  label: string;
  type: string;
  value: string | null;
  files: { id: string; url: string; sizeBytes: number | null }[];
};

export async function getReportDetail(id: string) {
  const r = await prisma.report.findUnique({
    where: { id },
    include: {
      form: { include: { fields: { orderBy: { order: "asc" } } } },
      shift: { select: { name: true } },
      answers: true,
      files: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!r) return null;

  const answerByField = new Map(r.answers.map((a) => [a.fieldId, a]));

  const fields: ReportDetailField[] = r.form.fields.map((f) => {
    const a = answerByField.get(f.id);
    let value: string | null = null;
    if (a) {
      if (a.valueNumber !== null) value = String(a.valueNumber);
      else if (a.valueText) value = a.valueText;
      else if (a.valueDate) value = formatDateKey(a.valueDate);
      else if (Array.isArray(a.valueJson)) value = a.valueJson.join(", ");
      else if (a.valueJson === true) value = "Ya";
    }
    return {
      id: f.id,
      label: f.label,
      type: f.type,
      value,
      files: r.files
        .filter((file) => file.fieldId === f.id)
        .map((file) => ({ id: file.id, url: file.url, sizeBytes: file.sizeBytes })),
    };
  });

  return {
    id: r.id,
    shortId: `#${r.id.slice(-6).toUpperCase()}`,
    formName: r.form.name,
    status: r.status,
    reporterName: r.reporterName,
    shiftName: r.shift.name,
    reportDate: formatDateKey(r.reportDate),
    submittedAt: formatWibDateTime(r.createdAt),
    ipAddress: r.ipAddress,
    fields,
  };
}
