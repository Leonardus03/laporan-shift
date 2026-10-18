"use client";

import { useState } from "react";
import { deleteField, moveField, setFieldActive, updateField } from "@/actions/form-builder";
import { InlineMessage } from "@/components/ui/inline-message";
import { Spinner } from "@/components/ui/spinner";
import { ChevronLeftIcon } from "@/components/ui/icons";
import {
  FIELD_TYPE_LABEL,
  draftFromField,
  draftsEqual,
  type FieldDraft,
} from "@/lib/form-builder";
import type { FieldType } from "@prisma/client";
import { FieldInputs } from "./field-inputs";
import { useActionRunner } from "./use-action-runner";

export type FieldCardData = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
  maxFiles: number | null;
  isActive: boolean;
  dataCount: number;
};

export function FieldCard({
  field,
  index,
  total,
}: {
  field: FieldCardData;
  index: number;
  total: number;
}) {
  const saved = draftFromField(field);
  const [draft, setDraft] = useState<FieldDraft>(saved);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { pending, which, message, run } = useActionRunner();

  const dirty = !draftsEqual(draft, saved);
  const hasData = field.dataCount > 0;

  return (
    <li
      className={`rounded-2xl p-4 ring-1 transition ${
        field.isActive ? "bg-white ring-slate-200" : "bg-slate-50 ring-slate-200"
      } ${pending ? "opacity-90" : ""}`}
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
          {index + 1}
        </span>
        <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
          {FIELD_TYPE_LABEL[field.type]}
        </span>
        {field.required && (
          <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">Wajib</span>
        )}
        {!field.isActive && (
          <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
            Tersembunyi
          </span>
        )}
        <span className="font-mono text-xs text-slate-400">{field.key}</span>
        <span className="text-xs text-slate-500">
          {hasData ? `${field.dataCount} data terisi` : "belum ada data"}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Pindah ke atas"
            disabled={pending || index === 0}
            onClick={() => run("up", () => moveField({ id: field.id, direction: "up" }), () => "Urutan diperbarui.")}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            {which === "up" ? <Spinner className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4 rotate-90" />}
          </button>
          <button
            type="button"
            aria-label="Pindah ke bawah"
            disabled={pending || index === total - 1}
            onClick={() => run("down", () => moveField({ id: field.id, direction: "down" }), () => "Urutan diperbarui.")}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            {which === "down" ? <Spinner className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4 -rotate-90" />}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <FieldInputs
          idPrefix={`f-${field.id}`}
          draft={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          typeLocked={hasData}
          disabled={pending}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() =>
            run(
              "save",
              () => updateField({ id: field.id, ...draft }),
              (r) => {
                setDraft(r.draft);
                return "Perubahan tersimpan.";
              }
            )
          }
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {which === "save" && <Spinner />}
          {which === "save" ? "Menyimpan..." : "Simpan perubahan"}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              "active",
              () => setFieldActive({ id: field.id, isActive: !field.isActive }),
              () => (field.isActive ? "Kolom disembunyikan dari form." : "Kolom ditampilkan di form.")
            )
          }
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {which === "active" && <Spinner />}
          {field.isActive ? "Sembunyikan" : "Tampilkan"}
        </button>

        {!hasData &&
          (confirmDelete ? (
            <span className="flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run("delete", () => deleteField({ id: field.id }), () => "Kolom dihapus.")}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {which === "delete" && <Spinner />}
                Ya, hapus
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Batal
              </button>
            </span>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Hapus
            </button>
          ))}
        {hasData && (
          <span className="text-xs text-slate-500">Sudah ada data, jadi cuma bisa disembunyikan.</span>
        )}
      </div>

      {message && (
        <div className="mt-3">
          <InlineMessage ok={message.ok}>{message.text}</InlineMessage>
        </div>
      )}
    </li>
  );
}
