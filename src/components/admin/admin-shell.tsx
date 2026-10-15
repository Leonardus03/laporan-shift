"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/actions/auth";
import {
  CloseIcon,
  DashboardIcon,
  DatabaseIcon,
  DocumentIcon,
  HistoryIcon,
  InboxIcon,
  ListIcon,
  LogoutIcon,
  MenuIcon,
  SearchIcon,
  UsersIcon,
} from "@/components/ui/icons";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  ready: boolean;
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: DashboardIcon, ready: true },
  { label: "Laporan Masuk", href: "/admin/laporan", icon: InboxIcon, ready: false },
  { label: "Jenis Laporan", href: "/admin/form-builder", icon: ListIcon, ready: false },
  { label: "Master Data", href: "/admin/master", icon: DatabaseIcon, ready: false },
  { label: "Audit Log", href: "/admin/audit-log", icon: HistoryIcon, ready: false },
  { label: "Pengguna Admin", href: "/admin/admin-users", icon: UsersIcon, ready: false },
];

export function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
          <DocumentIcon className="h-5 w-5" />
        </span>
        <span className="text-lg font-extrabold tracking-tight text-slate-900">Laporan Shift</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          if (!item.ready) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400"
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  Segera
                </span>
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 lg:block">
        {sidebar}
      </aside>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
          />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">
            <button
              type="button"
              aria-label="Tutup menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button
            type="button"
            aria-label="Buka menu"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <form action="/admin/dashboard" method="get" className="relative hidden max-w-md flex-1 sm:block">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              placeholder="Cari ID laporan atau nama petugas..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </form>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                {adminName.slice(0, 1).toUpperCase()}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold text-slate-900">{adminName}</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogoutIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
