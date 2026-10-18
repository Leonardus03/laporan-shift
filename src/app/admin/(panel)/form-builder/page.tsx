import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { LinkPending } from "@/components/ui/link-pending";
import { CopyLinkButton } from "@/components/admin/form-builder/copy-link-button";

export default async function FormBuilderListPage() {
  await requireAdmin();

  const forms = await prisma.reportForm.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { fields: true, reports: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Jenis Laporan</h1>
          <p className="mt-1 text-sm text-slate-500">
            Atur jenis laporan dan kolom isiannya tanpa coding. Perubahan langsung berlaku di halaman pelapor.
          </p>
        </div>
        <Link
          href="/admin/form-builder/new"
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-[0.98]"
        >
          + Buat Jenis Laporan
          <LinkPending className="h-4 w-4" />
        </Link>
      </div>

      {forms.length === 0 && (
        <p className="rounded-2xl bg-white p-8 text-center text-slate-500 ring-1 ring-slate-100">
          Belum ada jenis laporan. Klik &quot;Buat Jenis Laporan&quot; untuk memulai.
        </p>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {forms.map((f) => (
          <li key={f.id} className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">{f.name}</h2>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    f.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {f.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              {f.description && <p className="mt-1 text-sm text-slate-500">{f.description}</p>}
              <p className="mt-2 font-mono text-xs text-slate-400">/lapor/{f.slug}</p>
              <p className="mt-3 text-sm text-slate-600">
                {f._count.fields} kolom isian • {f._count.reports} laporan masuk
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/form-builder/${f.id}`}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98]"
              >
                Atur Kolom
                <LinkPending className="h-4 w-4" />
              </Link>
              {f.isActive && (
                <a
                  href={`/lapor/${f.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Buka form
                </a>
              )}
              <CopyLinkButton path={`/lapor/${f.slug}`} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
