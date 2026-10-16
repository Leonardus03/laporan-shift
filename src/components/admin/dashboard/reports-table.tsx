import Link from "next/link";
import type { ReportStatus } from "@prisma/client";
import { ChevronLeftIcon, ChevronRightIcon, FilterIcon, InboxStackIcon, SearchIcon } from "@/components/ui/icons";
import { PAGE_SIZE, STATUS_OPTIONS } from "@/lib/reports";
import { FORM_BADGES } from "./palette";
import { StatusBadge, statusLabel } from "./status-badge";

export type ReportRow = {
  id: string;
  shortId: string;
  time: string;
  reportDate: string;
  shiftName: string;
  formId: string;
  formName: string;
  reporterName: string;
  status: ReportStatus;
  summary: string;
};

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function pageList(current: number, last: number): (number | "...")[] {
  const set = new Set([1, last, current - 1, current, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out: (number | "...")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("...");
    out.push(n);
  });
  return out;
}

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export function ReportsTable({
  rows,
  total,
  page,
  forms,
  current,
  basePath,
  title = "Daftar Laporan Terbaru",
  subtitle = "Laporan shift yang masuk, diurutkan dari yang terbaru.",
  shifts,
  viewAllHref,
}: {
  rows: ReportRow[];
  total: number;
  page: number;
  forms: { id: string; name: string }[];
  current: Record<string, string>;
  basePath: string;
  title?: string;
  subtitle?: string;
  shifts?: { id: string; name: string }[];
  viewAllHref?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  const formIndex = new Map(forms.map((f, i) => [f.id, i]));
  const hasTableFilter = Boolean(
    current.q || current.form || current.status || (shifts && current.shift)
  );

  const hrefFor = (p: number) => {
    const params = new URLSearchParams(current);
    if (p > 1) params.set("page", String(p));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const resetHref = () => {
    const params = new URLSearchParams(current);
    ["q", "form", "status", "page", ...(shifts ? ["shift"] : [])].forEach((k) =>
      params.delete(k)
    );
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
          {viewAllHref && (
            <Link href={viewAllHref} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              Lihat semua
            </Link>
          )}
        </div>

        <form action={basePath} method="get" className="flex flex-wrap items-center gap-2">
          {current.range && <input type="hidden" name="range" value={current.range} />}
          {!shifts && current.shift && <input type="hidden" name="shift" value={current.shift} />}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={current.q ?? ""}
              placeholder="Cari ID atau nama petugas..."
              className={`${fieldClass} w-full pl-9`}
            />
          </div>
          {shifts && (
            <select name="shift" defaultValue={current.shift ?? ""} aria-label="Shift" className={fieldClass}>
              <option value="">Semua Shift</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <select name="form" defaultValue={current.form ?? ""} aria-label="Kategori" className={fieldClass}>
            <option value="">Semua Kategori</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={current.status ?? ""} aria-label="Status" className={fieldClass}>
            <option value="">Semua Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <FilterIcon className="h-4 w-4" />
            Terapkan
          </button>
          {hasTableFilter && (
            <Link href={resetHref()} className="text-sm font-medium text-slate-500 hover:text-slate-700">
              Reset
            </Link>
          )}
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">ID LAPORAN</th>
              <th className="px-3 py-3">WAKTU &amp; SHIFT</th>
              <th className="px-3 py-3">JENIS LAPORAN</th>
              <th className="px-3 py-3">PETUGAS</th>
              <th className="px-3 py-3">CATATAN OPERASIONAL</th>
              <th className="px-3 py-3">STATUS</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                  <InboxStackIcon className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  {hasTableFilter ? "Tidak ada laporan yang cocok dengan filter." : "Belum ada laporan masuk."}
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const badge = FORM_BADGES[(formIndex.get(r.formId) ?? 0) % FORM_BADGES.length];
              return (
                <tr key={r.id} className={r.status === "REJECTED" ? "bg-red-50/50" : "hover:bg-slate-50/60"}>
                  <td className="px-5 py-4 font-mono text-xs font-bold">
                    <Link href={`/admin/laporan/${r.id}`} className="text-indigo-700 hover:underline">
                      {r.shortId}
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-slate-600">
                    <div className="font-semibold text-slate-800">{r.time} WIB</div>
                    <div className="text-xs">
                      {r.shiftName} • {r.reportDate}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span className={`inline-block rounded-lg px-2.5 py-1.5 text-xs font-semibold ${badge}`}>
                      {r.formName}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(r.reporterName)}`}
                      >
                        {initials(r.reporterName)}
                      </span>
                      <span className="font-medium text-slate-800">{r.reporterName}</span>
                    </div>
                  </td>
                  <td className="max-w-xs px-3 py-4 text-slate-600">
                    <span className="line-clamp-2">{r.summary}</span>
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/laporan/${r.id}`}
                      className="whitespace-nowrap text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
        <p>
          Menampilkan {from} - {to} dari {total} laporan shift
        </p>
        {totalPages > 1 && (
          <nav className="flex items-center gap-1" aria-label="Halaman">
            {page > 1 ? (
              <Link href={hrefFor(page - 1)} aria-label="Sebelumnya" className="rounded-lg p-2 hover:bg-slate-100">
                <ChevronLeftIcon className="h-4 w-4" />
              </Link>
            ) : (
              <span className="rounded-lg p-2 text-slate-300">
                <ChevronLeftIcon className="h-4 w-4" />
              </span>
            )}
            {pageList(page, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`gap-${i}`} className="px-1">
                  ...
                </span>
              ) : (
                <Link
                  key={p}
                  href={hrefFor(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={
                    p === page
                      ? "rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white"
                      : "rounded-lg px-3 py-1.5 hover:bg-slate-100"
                  }
                >
                  {p}
                </Link>
              )
            )}
            {page < totalPages ? (
              <Link href={hrefFor(page + 1)} aria-label="Berikutnya" className="rounded-lg p-2 hover:bg-slate-100">
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            ) : (
              <span className="rounded-lg p-2 text-slate-300">
                <ChevronRightIcon className="h-4 w-4" />
              </span>
            )}
          </nav>
        )}
      </div>
    </section>
  );
}
