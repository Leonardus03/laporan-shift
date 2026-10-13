import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { logout } from "@/actions/auth";

// Panel admin selalu baca sesi login saat request, jadi tidak di-prerender.
export const instant = false;

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-700">
            <span className="font-semibold text-slate-900">Laporan Shift</span>
            <Link href="/admin/dashboard" className="hover:text-indigo-600">
              Dashboard
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">{admin.name}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
