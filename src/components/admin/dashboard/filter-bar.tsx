"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ExportMenu } from "@/components/admin/export-menu";

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
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(current);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/admin/dashboard?${qs}` : "/admin/dashboard");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      {pending && (
        <span className="flex items-center gap-1.5 text-sm text-indigo-600">
          <Spinner />
          Memuat...
        </span>
      )}
      <select
        aria-label="Periode"
        value={current.range ?? "7"}
        disabled={pending}
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
        disabled={pending}
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
      <ExportMenu current={current} />
    </div>
  );
}
