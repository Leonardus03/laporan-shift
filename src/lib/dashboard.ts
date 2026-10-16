import "server-only";
import type { ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getReportTable } from "@/lib/reports";

export { PAGE_SIZE, STATUS_OPTIONS, formatWibTime } from "@/lib/reports";

export const RANGE_OPTIONS = [7, 14, 30] as const;
export type RangeOption = (typeof RANGE_OPTIONS)[number];

export type DashboardFilters = {
  range: RangeOption;
  shiftId?: string;
  formId?: string;
  status?: ReportStatus;
  q?: string;
  page: number;
};

export type DayPoint = {
  key: string;
  label: string;
  isToday: boolean;
  total: number;
  perShift: Record<string, number>;
};

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function wibDateKey(d: Date) {
  return new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(key: string, n: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function keyToDate(key: string) {
  return new Date(`${key}T00:00:00Z`);
}

export function formatWibLongDate(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

export async function getDashboardData(f: DashboardFilters) {
  const now = new Date();
  const todayKey = wibDateKey(now);
  const startKey = addDays(todayKey, -(f.range - 1));
  const prevStartKey = addDays(startKey, -f.range);
  const prevEndKey = addDays(startKey, -1);
  const shiftWhere = f.shiftId ? { shiftId: f.shiftId } : {};

  const [shifts, forms, reports, prevTotal, todayReports, table] = await Promise.all([
    prisma.shift.findMany({ orderBy: { name: "asc" } }),
    prisma.reportForm.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.report.findMany({
      where: {
        ...shiftWhere,
        reportDate: { gte: keyToDate(startKey), lte: keyToDate(todayKey) },
      },
      select: { reportDate: true, shiftId: true, formId: true, status: true },
    }),
    prisma.report.count({
      where: {
        ...shiftWhere,
        reportDate: { gte: keyToDate(prevStartKey), lte: keyToDate(prevEndKey) },
      },
    }),
    prisma.report.findMany({
      where: { reportDate: keyToDate(todayKey) },
      select: { shiftId: true, createdAt: true },
    }),
    getReportTable({
      shiftId: f.shiftId,
      formId: f.formId,
      status: f.status,
      q: f.q,
      page: f.page,
    }),
  ]);

  // --- tren harian per shift ---
  const days: DayPoint[] = [];
  for (let i = f.range - 1; i >= 0; i--) {
    const key = addDays(todayKey, -i);
    const dow = keyToDate(key).getUTCDay();
    days.push({
      key,
      label: f.range <= 7 ? DAY_LABELS[dow] : `${key.slice(8, 10)}/${key.slice(5, 7)}`,
      isToday: i === 0,
      total: 0,
      perShift: {},
    });
  }
  const dayIndex = new Map(days.map((d, i) => [d.key, i]));
  const countByForm = new Map<string, number>();
  const byStatus: Record<ReportStatus, number> = {
    SUBMITTED: 0,
    REVIEWED: 0,
    REJECTED: 0,
  };

  for (const r of reports) {
    const idx = dayIndex.get(r.reportDate.toISOString().slice(0, 10));
    if (idx !== undefined) {
      const d = days[idx];
      d.total += 1;
      d.perShift[r.shiftId] = (d.perShift[r.shiftId] ?? 0) + 1;
    }
    countByForm.set(r.formId, (countByForm.get(r.formId) ?? 0) + 1);
    byStatus[r.status] += 1;
  }

  const total = reports.length;
  const changePct =
    prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : null;
  const reviewedPct = total > 0 ? Math.round((byStatus.REVIEWED / total) * 1000) / 10 : null;
  const avgPerDay = Math.round((total / f.range) * 10) / 10;
  const peakDay = days.reduce<DayPoint | null>(
    (best, d) => (d.total > 0 && (!best || d.total > best.total) ? d : best),
    null
  );

  // --- distribusi jenis laporan ---
  const distribution = forms
    .map((fm) => ({
      id: fm.id,
      name: fm.name,
      count: countByForm.get(fm.id) ?? 0,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((x) => ({
      ...x,
      pct: total > 0 ? Math.round((x.count / total) * 1000) / 10 : 0,
    }));

  // --- ringkasan hari ini ---
  const todayPerShift = shifts.map((s) => ({
    id: s.id,
    name: s.name,
    count: todayReports.filter((r) => r.shiftId === s.id).length,
  }));
  const lastToday = todayReports.reduce<Date | null>(
    (latest, r) => (!latest || r.createdAt > latest ? r.createdAt : latest),
    null
  );

  return {
    now,
    shifts,
    forms,
    activeForms: forms.filter((x) => x.isActive),
    total,
    prevTotal,
    changePct,
    byStatus,
    reviewedPct,
    avgPerDay,
    peakDay,
    days,
    distribution,
    todayPerShift,
    todayTotal: todayReports.length,
    lastToday,
    tableTotal: table.total,
    rows: table.rows,
  };
}
