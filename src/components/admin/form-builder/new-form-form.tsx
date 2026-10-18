"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createForm } from "@/actions/form-builder";
import { InlineMessage } from "@/components/ui/inline-message";
import { Spinner } from "@/components/ui/spinner";
import { LIMITS, slugifyName } from "@/lib/form-builder";
import { useActionRunner } from "./use-action-runner";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100";

export function NewFormForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [opening, setOpening] = useState(false);
  const { pending, message, run } = useActionRunner();
  const busy = pending || opening;

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugifyName(value));
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="space-y-1">
        <label htmlFor="nf-name" className="text-xs font-semibold text-slate-600">
          Nama jenis laporan
        </label>
        <input
          id="nf-name"
          value={name}
          maxLength={LIMITS.nameMax}
          disabled={busy}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Contoh: Cek Kendaraan Harian"
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="nf-slug" className="text-xs font-semibold text-slate-600">
          Alamat web
        </label>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-slate-500">/lapor/</span>
          <input
            id="nf-slug"
            value={slug}
            maxLength={LIMITS.slugMax}
            disabled={busy}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            placeholder="cek-kendaraan-harian"
            className={inputClass}
          />
        </div>
        <p className="text-xs text-slate-500">
          Dibuat otomatis dari nama. Huruf kecil, angka, dan tanda hubung. Jangan diubah setelah link dibagikan.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="nf-desc" className="text-xs font-semibold text-slate-600">
          Deskripsi (opsional)
        </label>
        <textarea
          id="nf-desc"
          rows={2}
          value={description}
          maxLength={LIMITS.descMax}
          disabled={busy}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="button"
        disabled={busy || name.trim().length < 2 || slug.length < 2}
        onClick={() =>
          run(
            "create",
            () => createForm({ name, slug, description }),
            (r) => {
              setOpening(true);
              router.push(`/admin/form-builder/${r.id}`);
              return "Jenis laporan dibuat. Membuka editor...";
            }
          )
        }
        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy && <Spinner />}
        {opening ? "Membuka editor..." : pending ? "Membuat..." : "Buat dan Atur Kolom"}
      </button>

      {message && <InlineMessage ok={message.ok}>{message.text}</InlineMessage>}
    </section>
  );
}
