"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { submitReport } from "@/actions/report";
import { CheckCircleIcon } from "@/components/ui/icons";
import type { FieldDef, FieldValue } from "@/lib/report-config";
import { PhotoField, type PhotoState } from "./photo-field";

type Props = {
  slug: string;
  name: string;
  description: string | null;
  fields: FieldDef[];
  shifts: { id: string; name: string }[];
  defaultDate: string;
};

type Values = Record<string, string | string[] | boolean>;

const STORAGE_KEY = "laporan-shift:pelapor";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2" id={id}>
      <label className="block text-sm font-semibold text-slate-800">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ReportForm({ slug, name: formName, description, fields, shifts, defaultDate }: Props) {
  const [reporter, setReporter] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [values, setValues] = useState<Values>({});
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as {
        name?: unknown;
        shiftId?: unknown;
      } | null;
      if (saved && typeof saved.name === "string") setReporter(saved.name);
      if (saved && typeof saved.shiftId === "string" && shifts.some((s) => s.id === saved.shiftId)) {
        setShiftId(saved.shiftId);
      }
    } catch {
      // abaikan: penyimpanan browser tidak tersedia
    }
  }, [shifts]);

  const updatePhoto = useCallback((key: string, next: PhotoState) => {
    setPhotos((prev) => {
      const cur = prev[key];
      const same =
        cur &&
        cur.busy === next.busy &&
        cur.files.length === next.files.length &&
        cur.files.every((f, i) => f.url === next.files[i].url);
      return same ? prev : { ...prev, [key]: next };
    });
  }, []);

  function setValue(key: string, value: string | string[] | boolean) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _removed, ...rest } = prev;
      void _removed;
      return rest;
    });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (reporter.trim().length < 2) errs._name = "Nama wajib diisi.";
    if (!shiftId) errs._shift = "Pilih shift.";
    if (!date) errs._date = "Tanggal wajib diisi.";

    for (const f of fields) {
      const v = values[f.key];
      if (f.type === "PHOTO") {
        if (f.required && (photos[f.key]?.files.length ?? 0) === 0) {
          errs[f.key] = "Wajib upload minimal 1 foto.";
        }
      } else if (f.type === "CHECKBOX") {
        const filled = f.options.length > 0 ? Array.isArray(v) && v.length > 0 : v === true;
        if (f.required && !filled) errs[f.key] = "Wajib diisi.";
      } else {
        const s = typeof v === "string" ? v.trim() : "";
        if (f.required && !s) errs[f.key] = "Wajib diisi.";
        else if (f.type === "NUMBER" && s && !Number.isFinite(Number(s.replace(",", ".")))) {
          errs[f.key] = "Harus berupa angka.";
        }
      }
    }

    if (Object.values(photos).some((p) => p.busy)) {
      errs._form = "Tunggu sampai semua foto selesai diunggah.";
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      if (!errs._form) errs._form = "Ada isian yang belum lengkap. Periksa tanda merah di atas.";
      setErrors(errs);
      return;
    }

    const payloadValues: Record<string, FieldValue> = {};
    for (const f of fields) {
      if (f.type === "PHOTO") payloadValues[f.key] = photos[f.key]?.files ?? [];
      else if (values[f.key] !== undefined) payloadValues[f.key] = values[f.key];
    }

    setErrors({});
    setSubmitting(true);
    try {
      const res = await submitReport({
        slug,
        reporterName: reporter.trim(),
        reportDate: date,
        shiftId,
        values: payloadValues,
      });
      if (!res.ok) {
        setErrors({ _form: res.error });
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: reporter.trim(), shiftId }));
      } catch {
        // abaikan
      }
      setDoneId(res.shortId);
    } catch {
      setErrors({ _form: "Gagal mengirim laporan. Periksa koneksi internet lalu coba lagi." });
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setValues({});
    setPhotos({});
    setErrors({});
    setDate(defaultDate);
    setFormKey((k) => k + 1);
    setDoneId(null);
  }

  if (doneId) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
        <CheckCircleIcon className="mx-auto h-16 w-16 text-emerald-500" />
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Laporan terkirim</h2>
        <p className="mt-2 text-slate-600">
          Terima kasih. Laporan <span className="font-semibold">{formName}</span> sudah tersimpan.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          ID laporan: <span className="font-mono font-bold text-indigo-700">{doneId}</span>
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-2xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700"
          >
            Isi laporan lagi
          </button>
          <Link
            href="/"
            className="rounded-2xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      key={formKey}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6 rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100"
    >
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{formName}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>

      <Field id="field-_name" label="Nama" required error={errors._name}>
        <input
          value={reporter}
          onChange={(e) => setReporter(e.target.value)}
          autoComplete="name"
          placeholder="Nama lengkap"
          className={inputClass}
        />
      </Field>

      <Field id="field-_shift" label="Shift" required error={errors._shift}>
        <div className="grid grid-cols-2 gap-2">
          {shifts.map((s) => (
            <label
              key={s.id}
              className={`flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                shiftId === s.id
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="shift"
                value={s.id}
                checked={shiftId === s.id}
                onChange={() => setShiftId(s.id)}
                className="sr-only"
              />
              {s.name}
            </label>
          ))}
        </div>
      </Field>

      <Field id="field-_date" label="Tanggal" required error={errors._date}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </Field>

      {fields.map((f) => {
        const v = values[f.key];
        const err = errors[f.key];
        return (
          <Field key={f.id} id={`field-${f.key}`} label={f.label} required={f.required} error={err}>
            {f.type === "TEXT" && (
              <input
                value={typeof v === "string" ? v : ""}
                onChange={(e) => setValue(f.key, e.target.value)}
                className={inputClass}
              />
            )}
            {f.type === "NUMBER" && (
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={typeof v === "string" ? v : ""}
                onChange={(e) => setValue(f.key, e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            )}
            {f.type === "DATE" && (
              <input
                type="date"
                value={typeof v === "string" ? v : ""}
                onChange={(e) => setValue(f.key, e.target.value)}
                className={inputClass}
              />
            )}
            {f.type === "DROPDOWN" && (
              <select
                value={typeof v === "string" ? v : ""}
                onChange={(e) => setValue(f.key, e.target.value)}
                className={inputClass}
              >
                <option value="">Pilih...</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            {f.type === "CHECKBOX" &&
              (f.options.length > 0 ? (
                <div className="space-y-2">
                  {f.options.map((o) => {
                    const current = Array.isArray(v) ? v : [];
                    const checked = current.includes(o);
                    return (
                      <label key={o} className="flex cursor-pointer items-center gap-3 text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setValue(f.key, checked ? current.filter((x) => x !== o) : [...current, o])
                          }
                          className="h-5 w-5 rounded-md accent-indigo-600"
                        />
                        {o}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-3 text-slate-700">
                  <input
                    type="checkbox"
                    checked={v === true}
                    onChange={(e) => setValue(f.key, e.target.checked)}
                    className="h-5 w-5 rounded-md accent-indigo-600"
                  />
                  Ya
                </label>
              ))}
            {f.type === "PHOTO" && (
              <PhotoField
                key={`${f.key}-${formKey}`}
                slug={slug}
                label={f.label}
                maxFiles={f.maxFiles}
                onChange={(s) => updatePhoto(f.key, s)}
              />
            )}
          </Field>
        );
      })}

      {errors._form && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors._form}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-indigo-600 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Mengirim..." : "Kirim Laporan"}
      </button>
    </form>
  );
}
