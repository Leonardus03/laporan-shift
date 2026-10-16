import Link from "next/link";
import { DocumentIcon } from "@/components/ui/icons";

export function PublicShell({
  children,
  backHref,
}: {
  children: React.ReactNode;
  backHref?: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-slate-50 to-white">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 pt-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <DocumentIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">Laporan Shift</span>
        </Link>
        {backHref && (
          <Link href={backHref} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Ganti jenis laporan
          </Link>
        )}
      </header>
      <main className="mx-auto w-full max-w-2xl px-5 py-6">{children}</main>
      <footer className="mx-auto w-full max-w-2xl px-5 pb-8 text-center text-xs text-slate-400">
        Sistem internal • <Link href="/admin/login" className="hover:text-slate-600">Login Admin</Link>
      </footer>
    </div>
  );
}
