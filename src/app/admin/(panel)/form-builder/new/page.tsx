import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { NewFormForm } from "@/components/admin/form-builder/new-form-form";

export default async function NewFormPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/admin/form-builder"
        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Kembali ke Jenis Laporan
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Buat Jenis Laporan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Isi nama dulu. Kolom isian (angka, teks, foto, dan lainnya) diatur di langkah berikutnya.
        </p>
      </div>
      <NewFormForm />
    </div>
  );
}
