"use client";

import { useActionState, useState } from "react";
import { login } from "@/actions/auth";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowRightIcon,
  AtIcon,
  DocumentIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotInfo, setShowForgotInfo] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-slate-50 to-white px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col">
        <header className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <DocumentIcon className="h-6 w-6" />
            </div>
            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold tracking-wider text-indigo-700">
              LAPORAN SHIFT
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Login Admin
            </h1>
            <p className="text-base text-slate-500">
              Silakan masuk untuk mengelola dan memantau shift kerja.
            </p>
          </div>
        </header>

        <section className="my-8 rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
          <form action={action} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-bold tracking-wider text-slate-800"
              >
                EMAIL
              </label>
              <div className="relative">
                <AtIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="nama@perusahaan.com"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-xs font-bold tracking-wider text-slate-800"
              >
                PASSWORD
              </label>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOffIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="remember"
                  defaultChecked
                  className="h-5 w-5 cursor-pointer rounded-md accent-indigo-600"
                />
                Ingat Saya
              </label>
              <button
                type="button"
                onClick={() => setShowForgotInfo((v) => !v)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Lupa Kata Sandi?
              </button>
            </div>

            {showForgotInfo && (
              <p className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                Hubungi administrator sistem untuk mengatur ulang kata sandi.
              </p>
            )}

            {state?.error && (
              <p
                role="alert"
                className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Spinner className="h-5 w-5" />
                  Memproses...
                </>
              ) : (
                <>
                  Masuk
                  <ArrowRightIcon className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </section>

        <footer className="mt-auto space-y-2 pb-2 text-center text-sm text-slate-400">
          <p className="flex items-center justify-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
            Sesi aman • Koneksi terenkripsi (HTTPS)
          </p>
          <p>© Laporan Shift. Seluruh hak cipta dilindungi.</p>
        </footer>
      </div>
    </main>
  );
}
