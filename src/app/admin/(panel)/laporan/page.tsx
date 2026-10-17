import type { ReportStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getReportTable, STATUS_OPTIONS } from "@/lib/reports";
import { ReportsTable } from "@/components/admin/dashboard/reports-table";
import { ExportMenu } from "@/components/admin/export-menu";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LaporanMasukPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const get = (key: string) => {
    const v = sp[key];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  };

  const statusParam = get("status");
  const status = STATUS_OPTIONS.includes(statusParam as ReportStatus)
    ? (statusParam as ReportStatus)
    : undefined;
  const shiftId = get("shift") || undefined;
  const formId = get("form") || undefined;
  const q = get("q")?.trim().slice(0, 60) || undefined;
  const page = Math.max(1, parseInt(get("page") ?? "1", 10) || 1);

  const [table, forms, shifts] = await Promise.all([
    getReportTable({ shiftId, formId, status, q, page }),
    prisma.reportForm.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.shift.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const current: Record<string, string> = {};
  if (shiftId) current.shift = shiftId;
  if (formId) current.form = formId;
  if (status) current.status = status;
  if (q) current.q = q;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Laporan Masuk</h1>
          <p className="mt-1 text-sm text-slate-500">
            Semua laporan shift yang dikirim pelapor. Klik Detail untuk melihat isian dan foto.
          </p>
        </div>
        <ExportMenu current={current} />
      </div>
      <ReportsTable
        rows={table.rows}
        total={table.total}
        page={page}
        forms={forms}
        shifts={shifts}
        current={current}
        basePath="/admin/laporan"
        title="Semua Laporan"
        subtitle="Diurutkan dari yang terbaru."
      />
    </div>
  );
}
