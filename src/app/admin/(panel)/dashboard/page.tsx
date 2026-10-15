import type { ReportStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/dal";
import {
  getDashboardData,
  formatWibLongDate,
  formatWibTime,
  RANGE_OPTIONS,
  STATUS_OPTIONS,
  type RangeOption,
} from "@/lib/dashboard";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { TrendChart } from "@/components/admin/dashboard/trend-chart";
import { DonutChart } from "@/components/admin/dashboard/donut-chart";
import { FilterBar } from "@/components/admin/dashboard/filter-bar";
import { ReportsTable } from "@/components/admin/dashboard/reports-table";
import { FORM_COLORS } from "@/components/admin/dashboard/palette";
import {
  BellAlertIcon,
  CheckCircleIcon,
  ClockIcon,
  InboxStackIcon,
  TagIcon,
} from "@/components/ui/icons";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdmin();
  const sp = await searchParams;

  const get = (key: string) => {
    const v = sp[key];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  };

  const rangeNum = Number(get("range"));
  const range: RangeOption = (RANGE_OPTIONS as readonly number[]).includes(rangeNum)
    ? (rangeNum as RangeOption)
    : 7;
  const statusParam = get("status");
  const status = STATUS_OPTIONS.includes(statusParam as ReportStatus)
    ? (statusParam as ReportStatus)
    : undefined;
  const shiftId = get("shift") || undefined;
  const formId = get("form") || undefined;
  const q = get("q")?.trim().slice(0, 60) || undefined;
  const page = Math.max(1, parseInt(get("page") ?? "1", 10) || 1);

  const data = await getDashboardData({ range, shiftId, formId, status, q, page });

  const current: Record<string, string> = { range: String(range) };
  if (shiftId) current.shift = shiftId;
  if (formId) current.form = formId;
  if (status) current.status = status;
  if (q) current.q = q;

  const formColor = new Map(
    data.forms.map((f, i) => [f.id, FORM_COLORS[i % FORM_COLORS.length]])
  );
  const distribution = data.distribution.map((d) => ({
    ...d,
    color: formColor.get(d.id) ?? FORM_COLORS[0],
  }));

  const pendingCount = data.byStatus.SUBMITTED;
  const rejectedCount = data.byStatus.REJECTED;
  const activeNames = data.activeForms.map((f) => f.name).join(", ");

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Halo, {admin.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Berikut ringkasan laporan shift ({formatWibLongDate(data.now)}).
          </p>
        </div>
        <FilterBar current={current} shifts={data.shifts.map((s) => ({ id: s.id, name: s.name }))} />
      </section>

      {/* Kartu statistik */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Laporan Masuk"
          value={data.total}
          unit="laporan"
          accent="indigo"
          icon={<InboxStackIcon className="h-5 w-5" />}
          footer={
            data.changePct === null ? (
              <span>Belum ada pembanding {range} hari sebelumnya</span>
            ) : (
              <span className="flex items-center gap-2">
                <span
                  className={`rounded-md px-1.5 py-0.5 font-semibold ${
                    data.changePct >= 0
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {data.changePct >= 0 ? "+" : ""}
                  {data.changePct}%
                </span>
                vs {range} hari sebelumnya
              </span>
            )
          }
        />
        <StatCard
          title="Jenis Laporan Aktif"
          value={data.activeForms.length}
          unit="kategori form"
          accent="violet"
          icon={<TagIcon className="h-5 w-5" />}
          footer={<span className="line-clamp-2">{activeNames || "Belum ada jenis laporan aktif"}</span>}
        />
        <StatCard
          title="Laporan Perlu Tindakan"
          value={pendingCount}
          unit="menunggu review"
          accent="red"
          icon={<BellAlertIcon className="h-5 w-5" />}
          footer={<span>{rejectedCount} laporan ditolak pada periode ini</span>}
        />
        <StatCard
          title="Sudah Direview"
          value={data.reviewedPct === null ? "—" : `${data.reviewedPct}%`}
          accent="emerald"
          icon={<CheckCircleIcon className="h-5 w-5" />}
          footer={
            <span>
              {data.byStatus.REVIEWED} dari {data.total} laporan
            </span>
          }
        />
      </section>

      {/* Ringkasan hari ini */}
      <section className="flex flex-wrap items-center gap-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
          <ClockIcon className="h-6 w-6" />
        </span>
        <div className="min-w-[200px] flex-1">
          <p className="text-[11px] font-bold tracking-widest text-emerald-600">HARI INI</p>
          <p className="text-xl font-extrabold text-slate-900">
            {data.todayTotal} laporan masuk
          </p>
          <p className="text-sm text-slate-500">
            {data.lastToday
              ? `Terakhir masuk pukul ${formatWibTime(data.lastToday)} WIB`
              : "Belum ada laporan hari ini"}
          </p>
        </div>
        <div className="grid min-w-[240px] flex-1 gap-3 sm:max-w-md">
          {data.todayPerShift.map((s) => {
            const pct = data.todayTotal > 0 ? Math.round((s.count / data.todayTotal) * 100) : 0;
            return (
              <div key={s.id}>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>{s.name}</span>
                  <span className="font-semibold">{s.count} laporan</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Grafik */}
      <section className="grid gap-5 lg:grid-cols-5">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-3">
          <h2 className="text-lg font-bold text-slate-900">Tren Volume Laporan Shift</h2>
          <p className="mb-4 text-sm text-slate-500">
            Jumlah laporan harian per shift ({range} hari terakhir).
          </p>
          <TrendChart days={data.days} shifts={data.shifts.map((s) => ({ id: s.id, name: s.name }))} />
          <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <p>
              Rata-rata: <span className="font-semibold text-slate-900">{data.avgPerDay} laporan/hari</span>
            </p>
            <p>
              Hari tersibuk:{" "}
              <span className="font-semibold text-slate-900">
                {data.peakDay ? `${data.peakDay.key} (${data.peakDay.total} laporan)` : "—"}
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-900">Distribusi Jenis Laporan</h2>
          <p className="mb-5 text-sm text-slate-500">
            Komposisi dari {data.activeForms.length} kategori aktif.
          </p>
          <DonutChart items={distribution} total={data.total} />
        </div>
      </section>

      {/* Tabel */}
      <ReportsTable
        rows={data.rows}
        total={data.tableTotal}
        page={page}
        forms={data.forms.map((f) => ({ id: f.id, name: f.name }))}
        current={current}
      />

      <p className="pb-2 text-center text-xs text-slate-400">
        Data dimuat pukul {formatWibTime(data.now)} WIB
      </p>
    </div>
  );
}
