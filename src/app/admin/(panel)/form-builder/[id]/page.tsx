import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { AddFieldForm } from "@/components/admin/form-builder/add-field-form";
import { CopyLinkButton } from "@/components/admin/form-builder/copy-link-button";
import { DeleteFormButton } from "@/components/admin/form-builder/delete-form-button";
import { FieldCard } from "@/components/admin/form-builder/field-card";
import { FormInfoForm } from "@/components/admin/form-builder/form-info-form";

export default async function FormEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const form = await prisma.reportForm.findUnique({
    where: { id },
    include: {
      fields: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        include: { _count: { select: { answers: true, files: true } } },
      },
      _count: { select: { reports: true } },
    },
  });
  if (!form) notFound();

  const activeCount = form.fields.filter((f) => f.isActive).length;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/form-builder"
        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Kembali ke Jenis Laporan
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{form.name}</h1>
          <p className="mt-1 font-mono text-xs text-slate-400">/lapor/{form.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {form.isActive && (
            <a
              href={`/lapor/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Lihat form pelapor
            </a>
          )}
          <CopyLinkButton path={`/lapor/${form.slug}`} />
        </div>
      </div>

      <FormInfoForm
        id={form.id}
        name={form.name}
        description={form.description ?? ""}
        isActive={form.isActive}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kolom Isian</h2>
          <p className="text-sm text-slate-500">
            Nama, shift, dan tanggal selalu ada di setiap form. Kolom di bawah ini adalah isian tambahannya
            ({activeCount} aktif dari {form.fields.length}).
          </p>
        </div>

        {form.fields.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">
            Belum ada kolom. Tambahkan kolom pertama di bawah.
          </p>
        )}

        <ul className="space-y-3">
          {form.fields.map((f, i) => (
            <FieldCard
              key={f.id}
              index={i}
              total={form.fields.length}
              field={{
                id: f.id,
                key: f.key,
                label: f.label,
                type: f.type,
                required: f.required,
                options: Array.isArray(f.options)
                  ? f.options.filter((o): o is string => typeof o === "string")
                  : [],
                maxFiles: f.maxFiles,
                isActive: f.isActive,
                dataCount: f._count.answers + f._count.files,
              }}
            />
          ))}
        </ul>

        <AddFieldForm formId={form.id} fieldCount={form.fields.length} />
      </section>

      <DeleteFormButton id={form.id} name={form.name} reportCount={form._count.reports} />
    </div>
  );
}
