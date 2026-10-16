import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { PublicShell } from "@/components/report/public-shell";
import { ArrowRightIcon, DocumentIcon } from "@/components/ui/icons";

export const instant = false;

export default async function HomePage() {
  await connection();

  const forms = await prisma.reportForm.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { slug: true, name: true, description: true },
  });

  return (
    <PublicShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Isi Laporan Shift</h1>
          <p className="text-slate-500">Pilih jenis laporan yang ingin diisi.</p>
        </div>

        {forms.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-slate-500 ring-1 ring-slate-100">
            Belum ada jenis laporan yang aktif.
          </p>
        )}

        <ul className="space-y-3">
          {forms.map((f) => (
            <li key={f.slug}>
              <Link
                href={`/lapor/${f.slug}`}
                className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-indigo-200"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <DocumentIcon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-slate-900">{f.name}</span>
                  {f.description && (
                    <span className="block truncate text-sm text-slate-500">{f.description}</span>
                  )}
                </span>
                <ArrowRightIcon className="h-5 w-5 shrink-0 text-indigo-500" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PublicShell>
  );
}
