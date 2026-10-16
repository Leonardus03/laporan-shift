import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { PublicShell } from "@/components/report/public-shell";
import { ReportForm } from "@/components/report/report-form";
import { todayWibKey } from "@/lib/dates";
import { DEFAULT_MAX_FILES, type FieldDef } from "@/lib/report-config";

export const instant = false;

export default async function LaporPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;

  const form = await prisma.reportForm.findFirst({
    where: { slug, isActive: true },
    include: { fields: { where: { isActive: true }, orderBy: { order: "asc" } } },
  });
  if (!form) notFound();

  const shifts = await prisma.shift.findMany({ orderBy: { name: "asc" } });

  const fields: FieldDef[] = form.fields.map((f) => ({
    id: f.id,
    key: f.key,
    label: f.label,
    type: f.type,
    required: f.required,
    options: Array.isArray(f.options)
      ? f.options.filter((o): o is string => typeof o === "string")
      : [],
    maxFiles: f.maxFiles ?? DEFAULT_MAX_FILES,
  }));

  const defaultDate = todayWibKey();

  return (
    <PublicShell backHref="/">
      <ReportForm
        slug={form.slug}
        name={form.name}
        description={form.description}
        fields={fields}
        shifts={shifts.map((s) => ({ id: s.id, name: s.name }))}
        defaultDate={defaultDate}
      />
    </PublicShell>
  );
}
