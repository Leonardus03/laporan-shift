"use client";

import { useState } from "react";
import { addField } from "@/actions/form-builder";
import { InlineMessage } from "@/components/ui/inline-message";
import { Spinner } from "@/components/ui/spinner";
import { LIMITS, type FieldDraft } from "@/lib/form-builder";
import { FieldInputs } from "./field-inputs";
import { useActionRunner } from "./use-action-runner";

const EMPTY: FieldDraft = {
  label: "",
  type: "TEXT",
  required: false,
  optionsText: "",
  maxFiles: LIMITS.photoMax,
};

export function AddFieldForm({ formId, fieldCount }: { formId: string; fieldCount: number }) {
  const [draft, setDraft] = useState<FieldDraft>(EMPTY);
  const { pending, message, run } = useActionRunner();
  const full = fieldCount >= LIMITS.fieldsMax;

  return (
    <section className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-4">
      <h3 className="text-base font-bold text-slate-900">Tambah Kolom Baru</h3>
      <p className="mb-4 text-sm text-slate-500">
        Kolom baru muncul di paling bawah form dan langsung tampil bagi pelapor.
      </p>

      <FieldInputs
        idPrefix={`add-${formId}`}
        draft={draft}
        onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        disabled={pending || full}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || full || draft.label.trim() === ""}
          onClick={() =>
            run(
              "add",
              () => addField({ formId, ...draft }),
              () => {
                setDraft(EMPTY);
                return "Kolom ditambahkan.";
              }
            )
          }
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Spinner />}
          {pending ? "Menambahkan..." : "Tambah Kolom"}
        </button>
        {full && (
          <span className="text-xs text-amber-600">Sudah mencapai batas {LIMITS.fieldsMax} kolom.</span>
        )}
      </div>

      {message && (
        <div className="mt-3">
          <InlineMessage ok={message.ok}>{message.text}</InlineMessage>
        </div>
      )}
    </section>
  );
}
