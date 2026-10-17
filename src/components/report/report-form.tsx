"use client";

import Link from "next/link";
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { submitReport } from "@/actions/report";
import { CameraIcon, CheckCircleIcon, ListIcon, UsersIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
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
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:opacity-60";

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

function Section({
  id,
  icon,
  title,
  required,
  hint,
  error,
  children,
}: {
  id?: string;
  icon: React.ReactNode;
  title: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-3xl bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-6"
    >
      <header className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">
            {title}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </h2>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
      </header>
      <div className="space-y-5">{children}</div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
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
  const [waiting, setWaiting] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const photoStates = Object.values(photos);
  const totalPhotos = photoStates.reduce((n, p) => n + p.total, 0);
  const donePhotos = photoStates.reduce((n, p) => n + p.done, 0);
  const uploadingPhotos = photoStates.reduce((n, p) => n + p.uploading, 0);
  const failedPhotos = photoStates.reduce((n, p) => n + p.failed, 0);
  const locked = submitting || waiting;

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
        cur.total === next.total &&
        cur.done === next.done &&
        cur.uploading === next.uploading &&
        cur.failed === next.failed &&
        cur.files.every((f, i) => f.url === next.files[i]?.url);
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
        if (f.required && (photos[f.key]?.files.length ?? 0) === 0 && (photos[f.key]?.uploading ?? 0) === 0) {
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
    return errs;
  }

  function showErrors(errs: Record<string, string>) {
    const hasFieldError = Object.keys(errs).some((k) => k !== "_form");
    const next = { ...errs };
    if (hasFieldError && !next._form) {
      next._form = "Ada isian yang belum lengkap. Periksa tanda merah di atas.";
    }
    setErrors(next);

    const order = ["_name", "_shift", "_date", ...fields.map((f) => f.key)];
    const first = order.find((k) => errs[k]);
    if (first) {
      requestAnimationFrame(() => {
        document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  async function send() {
    const errs = validate();
    if (failedPhotos > 0) {
      errs._form = "Ada foto yang gagal diunggah. Tekan \"Coba lagi\" pada foto itu, atau hapus.";
    }
    if (Object.keys(errs).length > 0) {
      showErrors(errs);
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrors({ _form: "Gagal mengirim laporan. Periksa koneksi internet lalu coba lagi." });
    } finally {
      setSubmitting(false);
    }
  }

  // Dipanggil otomatis begitu semua foto selesai diunggah (setelah pelapor menekan Kirim).
  const onUploadsSettled = useEffectEvent(() => {
    setWaiting(false);
    void send();
  });

  useEffect(() => {
    if (waiting && uploadingPhotos === 0) onUploadsSettled();
  }, [waiting, uploadingPhotos]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      showErrors(errs);
      return;
    }
    setErrors({});

    if (uploadingPhotos > 0) {
      setWaiting(true);
      return;
    }
    void send();
  }

  function resetForm() {
    setValues({});
    setPhotos({});
    setErrors({});
    setDate(defaultDate);
    setFormKey((k) => k + 1);
    setDoneId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
            className="rounded-2xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700 active:scale-[0.99]"
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

  const progressPct = totalPhotos > 0 ? Math.round((donePhotos / totalPhotos) * 100) : 0;

  const infoFields = fields.filter((f) => f.type !== "PHOTO");
  const photoFields = fields.filter((f) => f.type === "PHOTO");

  return (
    <form
      key={formKey}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={locked}
      className="space-y-4"
    >
      <div className="px-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{formName}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>

      <fieldset disabled={locked} className="m-0 min-w-0 space-y-4 border-0 p-0">
        <Section icon={<UsersIcon className="h-5 w-5" />} title="Data Pelapor" hint="Isi nama, shift, dan tanggal laporan">
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
                  className={`flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition active:scale-[0.98] ${
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
                    onChange={() => {
                      setShiftId(s.id);
                      setErrors((prev) => {
                        if (!prev._shift) return prev;
                        const { _shift: _removed, ...rest } = prev;
                        void _removed;
                        return rest;
                      });
                    }}
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
        </Section>

        {infoFields.length > 0 && (
          <Section icon={<ListIcon className="h-5 w-5" />} title="Isian Laporan">
            {infoFields.map((f) => {
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
                </Field>
              );
            })}
          </Section>
        )}

        {photoFields.map((f) => (
          <Section
            key={f.id}
            id={`field-${f.key}`}
            icon={<CameraIcon className="h-5 w-5" />}
            title={f.label}
            required={f.required}
            hint={`Maksimal ${f.maxFiles} foto`}
            error={errors[f.key]}
          >
            <PhotoField
              key={`${f.key}-${formKey}`}
              slug={slug}
              label={f.label}
              maxFiles={f.maxFiles}
              onChange={(s) => updatePhoto(f.key, s)}
            />
          </Section>
        ))}
      </fieldset>

      {errors._form && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors._form}
        </p>
      )}

      {(waiting || uploadingPhotos > 0) && (
        <div className="space-y-2 rounded-2xl bg-indigo-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm font-medium text-indigo-800">
            <span>Mengunggah foto</span>
            <span>
              {donePhotos}/{totalPhotos}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {waiting && (
            <p className="text-xs text-indigo-700">
              Laporan akan dikirim otomatis begitu semua foto selesai diunggah. Jangan tutup halaman ini.
            </p>
          )}
        </div>
      )}

      {waiting ? (
        <div className="space-y-2">
          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-base font-semibold text-white opacity-80"
          >
            <Spinner className="h-5 w-5" />
            Menunggu foto ({donePhotos}/{totalPhotos})...
          </button>
          <button
            type="button"
            onClick={() => setWaiting(false)}
            className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Batalkan pengiriman
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Spinner className="h-5 w-5" />
              Mengirim laporan...
            </>
          ) : (
            "Kirim Laporan"
          )}
        </button>
      )}
    </form>
  );
}
