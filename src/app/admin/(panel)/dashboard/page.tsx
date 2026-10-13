import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const admin = await requireAdmin();

  const [totalReports, totalForms] = await Promise.all([
    prisma.report.count(),
    prisma.reportForm.count({ where: { isActive: true } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Halo, {admin.name}
      </h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total laporan masuk</p>
          <p className="text-3xl font-semibold text-slate-900">
            {totalReports}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Jenis laporan aktif</p>
          <p className="text-3xl font-semibold text-slate-900">{totalForms}</p>
        </div>
      </div>
      <p className="text-sm text-slate-500">
        Grafik, filter, dan export akan ditambahkan di tahap berikutnya.
      </p>
    </div>
  );
}
