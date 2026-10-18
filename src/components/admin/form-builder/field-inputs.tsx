"use client";

import { FIELD_TYPES, FIELD_TYPE_LABEL, LIMITS, type FieldDraft } from "@/lib/form-builder";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500";

export function FieldInputs({
  draft,
  onChange,
  typeLocked = false,
  disabled = false,
  idPrefix,
}: {
  draft: FieldDraft;
  onChange: (patch: Partial<FieldDraft>) => void;
  typeLocked?: boolean;
  disabled?: boolean;
  idPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_15rem]">
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-label`} className="text-xs font-semibold text-slate-600">
            Nama kolom
          </label>
          <input
            id={`${idPrefix}-label`}
            value={draft.label}
            maxLength={LIMITS.labelMax}
            disabled={disabled}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Contoh: Jumlah palet dicuci"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-type`} className="text-xs font-semibold text-slate-600">
            Tipe isian
          </label>
          <select
            id={`${idPrefix}-type`}
            value={draft.type}
            disabled={disabled || typeLocked}
            onChange={(e) => onChange({ type: e.target.value as FieldDraft["type"] })}
            className={inputClass}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {FIELD_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {typeLocked && (
        <p className="text-xs text-amber-600">
          Tipe dikunci karena sudah ada laporan yang mengisi kolom ini.
        </p>
      )}

      {(draft.type === "DROPDOWN" || draft.type === "CHECKBOX") && (
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-options`} className="text-xs font-semibold text-slate-600">
            Daftar pilihan (satu pilihan per baris)
          </label>
          <textarea
            id={`${idPrefix}-options`}
            rows={4}
            value={draft.optionsText}
            disabled={disabled}
            onChange={(e) => onChange({ optionsText: e.target.value })}
            placeholder={"Besar\nSedang\nKecil"}
            className={inputClass}
          />
          <p className="text-xs text-slate-500">
            {draft.type === "DROPDOWN"
              ? "Minimal 2 pilihan."
              : "Kosongkan kalau cuma butuh satu kotak centang (Ya)."}
          </p>
        </div>
      )}

      {draft.type === "PHOTO" && (
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-max`} className="text-xs font-semibold text-slate-600">
            Maksimal jumlah foto (1 sampai {LIMITS.photoMax})
          </label>
          <input
            id={`${idPrefix}-max`}
            type="number"
            min={1}
            max={LIMITS.photoMax}
            value={draft.maxFiles}
            disabled={disabled}
            onChange={(e) => onChange({ maxFiles: Number(e.target.value) })}
            className={`${inputClass} sm:w-40`}
          />
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={draft.required}
          disabled={disabled}
          onChange={(e) => onChange({ required: e.target.checked })}
          className="h-4 w-4 rounded accent-indigo-600"
        />
        Wajib diisi
      </label>
    </div>
  );
}
