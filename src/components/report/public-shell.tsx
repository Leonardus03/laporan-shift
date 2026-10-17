import Link from "next/link";
import { Suspense } from "react";
import { getCurrentAdmin } from "@/lib/dal";
import { DocumentIcon, LockIcon } from "@/components/ui/icons";
import { LinkButtonLabel } from "@/components/ui/link-button-label";
import { LinkPending } from "@/components/ui/link-pending";

const adminLinkClass =
  "flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 active:scale-[0.97]";

// Admin yang sudah login melihat "Ke Dashboard", pengunjung lain melihat "Login Admin".
async function AdminEntry() {
  const admin = await getCurrentAdmin();
  return admin ? (
    <Link href="/admin/dashboard" className={adminLinkClass}>
      <LinkButtonLabel icon={<LockIcon className="h-4 w-4" />} label="Ke Dashboard" />
    </Link>
  ) : (
    <Link href="/admin/login" className={adminLinkClass}>
      <LinkButtonLabel icon={<LockIcon className="h-4 w-4" />} label="Login Admin" />
    </Link>
  );
}

export function PublicShell({
  children,
  backHref,
}: {
  children: React.ReactNode;
  backHref?: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-slate-50 to-white">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-5 pt-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <DocumentIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">Laporan Shift</span>
        </Link>
        <Suspense
          fallback={
            <Link href="/admin/login" className={adminLinkClass}>
              <LinkButtonLabel icon={<LockIcon className="h-4 w-4" />} label="Login Admin" />
            </Link>
          }
        >
          <AdminEntry />
        </Suspense>
      </header>
      {backHref && (
        <div className="mx-auto w-full max-w-2xl px-5 pt-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Ganti jenis laporan
            <LinkPending />
          </Link>
        </div>
      )}
      <main className="mx-auto w-full max-w-2xl px-5 py-6">{children}</main>
      <footer className="mx-auto w-full max-w-2xl px-5 pb-8 text-center text-xs text-slate-400">
        Sistem internal Laporan Shift
      </footer>
    </div>
  );
}
