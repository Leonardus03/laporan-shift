import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { PublicShell } from "@/components/report/public-shell";
import { FormCardContent } from "@/components/report/form-card";

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
                className="block rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:shadow-md hover:ring-indigo-200 active:scale-[0.99]"
              >
                <FormCardContent name={f.name} description={f.description} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PublicShell>
  );
}
