import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReportStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/dal";
import { getReportDetail } from "@/lib/reports";
import { updateReportStatus } from "@/actions/admin-report";
import { StatusBadge } from "@/components/admin/dashboard/status-badge";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { SubmitButton } from "@/components/ui/submit-button";

const ACTIONS: Record<ReportStatus, { label: string; className: string }> = {
  REVIEWED: {
    label: "Tandai Selesai",
    className: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  REJECTED: {
    label: "Tolak Laporan",
    className: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  },
  SUBMITTED: {
    label: "Kembalikan ke Menunggu",
    className: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  },
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

export default async function LaporanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const report = await getReportDetail(id);
  if (!report) notFound();

  const nextStatuses = (Object.keys(ACTIONS) as ReportStatus[]).filter((s) => s !== report.status);
  const textFields = report.fields.filter((f) => f.type !== "PHOTO");
  const photoFields = report.fields.filter((f) => f.type === "PHOTO");

  return (
    <div className="space-y-5">
      <Link
        href="/admin/laporan"
        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Kembali ke Laporan Masuk
      </Link>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm font-bold text-indigo-700">{report.shortId}</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {report.formName}
            </h1>
          </div>
          <StatusBadge status={report.status} />
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold tracking-wider text-slate-500">PELAPOR</dt>
            <dd className="mt-1 font-semibold text-slate-900">{report.reporterName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wider text-slate-500">SHIFT</dt>
            <dd className="mt-1 font-semibold text-slate-900">{report.shiftName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wider text-slate-500">TANGGAL LAPORAN</dt>
            <dd className="mt-1 font-semibold text-slate-900">{report.reportDate}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wider text-slate-500">DIKIRIM</dt>
            <dd className="mt-1 font-semibold text-slate-900">{report.submittedAt}</dd>
          </div>
        </dl>
        {report.ipAddress && (
          <p className="mt-4 text-xs text-slate-400">IP pengirim: {report.ipAddress}</p>
        )}

        <form action={updateReportStatus} className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          <input type="hidden" name="reportId" value={report.id} />
          {nextStatuses.map((s) => (
            <SubmitButton
              key={s}
              name="status"
              value={s}
              pendingText="Menyimpan..."
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${ACTIONS[s].className}`}
            >
              {ACTIONS[s].label}
            </SubmitButton>
          ))}
        </form>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-bold text-slate-900">Isian Laporan</h2>
        {textFields.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Jenis laporan ini tidak punya isian selain foto.</p>
        ) : (
          <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {textFields.map((f) => (
              <div key={f.id} className="border-b border-slate-100 pb-3">
                <dt className="text-sm text-slate-500">{f.label}</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{f.value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {photoFields.map((f) => (
        <section key={f.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">{f.label}</h2>
            <span className="text-sm text-slate-500">{f.files.length} foto</span>
          </div>
          {f.files.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Tidak ada foto.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {f.files.map((file, i) => (
                <li key={file.id}>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 transition hover:ring-indigo-300"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.url}
                      alt={`${f.label} ${i + 1}`}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  </a>
                  <p className="mt-1 text-xs text-slate-400">{formatSize(file.sizeBytes)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
