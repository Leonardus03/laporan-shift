"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircleIcon, AlertCircleIcon, DownloadIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";

type Format = "xlsx" | "pdf" | "csv";

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "xlsx", label: "Excel (.xlsx)", hint: "Data lengkap, ringkasan, dan link foto" },
  { id: "pdf", label: "PDF", hint: "Siap cetak atau dibagikan" },
  { id: "csv", label: "CSV", hint: "Data mentah untuk diolah lagi" },
];

const dateClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export function ExportMenu({ current }: { current: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<Format | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const customDates = Boolean(from || to);
  const periodText = customDates
    ? `Periode: ${from || "awal"} s/d ${to || "sekarang"}`
    : current.range
      ? `Periode: ${current.range} hari terakhir (sesuai dashboard)`
      : "Periode: semua tanggal";

  function hrefFor(fmt: Format) {
    const p = new URLSearchParams();
    for (const k of ["shift", "form", "status", "q"]) {
      if (current[k]) p.set(k, current[k]);
    }
    if (customDates) {
      if (from) p.set("from", from);
      if (to) p.set("to", to);
    } else if (current.range) {
      p.set("range", current.range);
    }
    return `/api/export/${fmt}?${p.toString()}`;
  }

  async function download(fmt: Format) {
    setBusy(fmt);
    setMessage(null);
    try {
      const res = await fetch(hrefFor(fmt));
      if (!res.ok) {
        let text = "Gagal menyiapkan file. Coba lagi.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) text = j.error;
        } catch {
          // abaikan: respons bukan JSON
        }
        throw new Error(text);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `laporan-shift.${fmt}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      setMessage({ ok: true, text: `${name} berhasil diunduh.` });
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Gagal menyiapkan file. Coba lagi.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700 active:scale-[0.97]"
      >
        {busy ? <Spinner className="h-4 w-4" /> : <DownloadIcon className="h-4 w-4" />}
        {busy ? "Menyiapkan..." : "Ekspor"}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 sm:left-auto sm:right-0">
          <p className="text-sm font-bold text-slate-900">Ekspor Data Laporan</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Mengikuti filter yang sedang aktif. {periodText}.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs font-medium text-slate-600">
              Dari tanggal
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateClass} />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-600">
              Sampai tanggal
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={dateClass} />
            </label>
          </div>
          {customDates && (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Pakai periode bawaan
            </button>
          )}

          <ul className="mt-3 space-y-2">
            {FORMATS.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => download(f.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    {busy === f.id ? <Spinner className="h-5 w-5" /> : <DownloadIcon className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">
                      {busy === f.id ? "Menyiapkan file..." : f.label}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{f.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {message && (
            <p
              role="status"
              className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${
                message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {message.ok ? (
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
