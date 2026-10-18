"use client";

import { useState } from "react";
import { updateFormInfo } from "@/actions/form-builder";
import { InlineMessage } from "@/components/ui/inline-message";
import { Spinner } from "@/components/ui/spinner";
import { LIMITS } from "@/lib/form-builder";
import { useActionRunner } from "./use-action-runner";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100";

export function FormInfoForm({
  id,
  name,
  description,
  isActive,
}: {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}) {
  const [n, setN] = useState(name);
  const [d, setD] = useState(description);
  const [active, setActive] = useState(isActive);
  const { pending, message, run } = useActionRunner();
  const dirty = n !== name || d !== description || active !== isActive;

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <h2 className="text-lg font-bold text-slate-900">Info Jenis Laporan</h2>

      <div className="space-y-1">
        <label htmlFor="fi-name" className="text-xs font-semibold text-slate-600">
          Nama jenis laporan
        </label>
        <input
          id="fi-name"
          value={n}
          maxLength={LIMITS.nameMax}
          disabled={pending}
          onChange={(e) => setN(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="fi-desc" className="text-xs font-semibold text-slate-600">
          Deskripsi (tampil di bawah judul form)
        </label>
        <textarea
          id="fi-desc"
          rows={2}
          value={d}
          maxLength={LIMITS.descMax}
          disabled={pending}
          onChange={(e) => setD(e.target.value)}
          placeholder="Opsional"
          className={inputClass}
        />
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
        <span>
          <span className="block text-sm font-semibold text-slate-900">
            {active ? "Aktif" : "Nonaktif"}
          </span>
          <span className="block text-xs text-slate-500">
            {active
              ? "Tampil di halaman pelapor dan bisa diisi."
              : "Disembunyikan dari pelapor. Data lama tetap aman."}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={active}
          disabled={pending}
          onChange={(e) => setActive(e.target.checked)}
          className="h-6 w-11 cursor-pointer appearance-none rounded-full bg-slate-300 transition checked:bg-indigo-600 relative before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:transition checked:before:translate-x-5"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() => run("save", () => updateFormInfo({ id, name: n, description: d, isActive: active }))}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Spinner />}
          {pending ? "Menyimpan..." : "Simpan Info"}
        </button>
      </div>

      {message && <InlineMessage ok={message.ok}>{message.text}</InlineMessage>}
    </section>
  );
}
