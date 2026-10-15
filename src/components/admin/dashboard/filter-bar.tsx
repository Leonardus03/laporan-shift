"use client";

import { useRouter } from "next/navigation";
import { DownloadIcon } from "@/components/ui/icons";

const selectClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export function FilterBar({
  current,
  shifts,
}: {
  current: Record<string, string>;
  shifts: { id: string; name: string }[];
}) {
  const router = useRouter();

  function update(key: string, value: string) {
    const params = new URLSearchParams(current);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/dashboard?${qs}` : "/admin/dashboard");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Periode"
        value={current.range ?? "7"}
        onChange={(e) => update("range", e.target.value)}
        className={selectClass}
      >
        <option value="7">7 Hari Terakhir</option>
        <option value="14">14 Hari Terakhir</option>
        <option value="30">30 Hari Terakhir</option>
      </select>
      <select
        aria-label="Shift"
        value={current.shift ?? ""}
        onChange={(e) => update("shift", e.target.value)}
        className={selectClass}
      >
        <option value="">Semua Shift</option>
        {shifts.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled
        title="Export Excel, PDF, dan CSV akan ditambahkan di tahap berikutnya"
        className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400"
      >
        <DownloadIcon className="h-4 w-4" />
        Ekspor
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
          Segera
        </span>
      </button>
    </div>
  );
}
