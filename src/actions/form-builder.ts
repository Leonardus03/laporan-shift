"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import {
  LIMITS,
  draftFromField,
  normalizeFieldInput,
  slugifyKey,
  uniqueKey,
  validateSlug,
  type FieldDraft,
} from "@/lib/form-builder";

type Scalar = string | number | boolean | null;
type Change = [Scalar, Scalar];

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function requireAdminForAction() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

function audit(
  admin: { id: string; name: string },
  action: string,
  entity: "ReportForm" | "FormField",
  entityId: string,
  changes?: Prisma.InputJsonValue
) {
  return logAudit({
    actorType: "ADMIN",
    actorId: admin.id,
    actorName: admin.name,
    action,
    entity,
    entityId,
    changes,
  });
}

function refresh(formId?: string, slug?: string) {
  revalidatePath("/admin/form-builder");
  if (formId) revalidatePath(`/admin/form-builder/${formId}`);
  revalidatePath("/");
  if (slug) revalidatePath(`/lapor/${slug}`);
  revalidatePath("/admin/dashboard");
}

function cleanName(name: unknown) {
  return typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
}

function cleanDescription(d: unknown) {
  const s = typeof d === "string" ? d.trim() : "";
  return s ? s : null;
}

// ------------------------------------------------------------ jenis laporan

export async function createForm(input: {
  name: string;
  slug: string;
  description: string;
}): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminForAction();
  const name = cleanName(input?.name);
  const slug = typeof input?.slug === "string" ? input.slug.trim() : "";
  const description = cleanDescription(input?.description);

  if (name.length < 2 || name.length > LIMITS.nameMax) {
    return { ok: false, error: `Nama harus 2 sampai ${LIMITS.nameMax} karakter.` };
  }
  const slugError = validateSlug(slug);
  if (slugError) return { ok: false, error: slugError };
  if (description && description.length > LIMITS.descMax) {
    return { ok: false, error: `Deskripsi maksimal ${LIMITS.descMax} karakter.` };
  }
  if (await prisma.reportForm.findUnique({ where: { slug }, select: { id: true } })) {
    return { ok: false, error: "Alamat sudah dipakai jenis laporan lain. Ganti alamatnya." };
  }

  const form = await prisma.reportForm.create({
    data: { name, slug, description },
    select: { id: true },
  });
  await audit(admin, "FORM_CREATED", "ReportForm", form.id, { nama: name, alamat: slug });
  refresh(form.id, slug);
  return { ok: true, id: form.id };
}

export async function updateFormInfo(input: {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  const name = cleanName(input?.name);
  const description = cleanDescription(input?.description);

  if (name.length < 2 || name.length > LIMITS.nameMax) {
    return { ok: false, error: `Nama harus 2 sampai ${LIMITS.nameMax} karakter.` };
  }
  if (description && description.length > LIMITS.descMax) {
    return { ok: false, error: `Deskripsi maksimal ${LIMITS.descMax} karakter.` };
  }

  const form = await prisma.reportForm.findUnique({ where: { id: input.id } });
  if (!form) return { ok: false, error: "Jenis laporan tidak ditemukan." };

  const isActive = Boolean(input.isActive);
  await prisma.reportForm.update({ where: { id: form.id }, data: { name, description, isActive } });

  const changes: Record<string, Change> = {};
  if (form.name !== name) changes.nama = [form.name, name];
  if (form.description !== description) changes.deskripsi = [form.description, description];
  if (form.isActive !== isActive) changes.aktif = [form.isActive, isActive];
  if (Object.keys(changes).length > 0) {
    await audit(admin, "FORM_UPDATED", "ReportForm", form.id, changes);
  }
  refresh(form.id, form.slug);
  return { ok: true };
}

export async function deleteForm(input: { id: string }): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  const form = await prisma.reportForm.findUnique({
    where: { id: input.id },
    include: { _count: { select: { reports: true } } },
  });
  if (!form) return { ok: false, error: "Jenis laporan tidak ditemukan." };
  if (form._count.reports > 0) {
    return {
      ok: false,
      error: `Nggak bisa dihapus karena sudah ada ${form._count.reports} laporan. Nonaktifkan saja.`,
    };
  }
  await prisma.reportForm.delete({ where: { id: form.id } });
  await audit(admin, "FORM_DELETED", "ReportForm", form.id, { nama: form.name, alamat: form.slug });
  refresh(undefined, form.slug);
  return { ok: true };
}

// ------------------------------------------------------------ kolom isian

export async function addField(input: { formId: string } & FieldDraft): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  const parsed = normalizeFieldInput(input);
  if (!parsed.ok) return parsed;

  const form = await prisma.reportForm.findUnique({
    where: { id: input.formId },
    include: { fields: { select: { key: true, order: true } } },
  });
  if (!form) return { ok: false, error: "Jenis laporan tidak ditemukan." };
  if (form.fields.length >= LIMITS.fieldsMax) {
    return { ok: false, error: `Maksimal ${LIMITS.fieldsMax} kolom per jenis laporan.` };
  }

  const key = uniqueKey(slugifyKey(parsed.value.label), new Set(form.fields.map((f) => f.key)));
  const order = form.fields.reduce((m, f) => Math.max(m, f.order), 0) + 1;
  const v = parsed.value;

  const field = await prisma.formField.create({
    data: {
      formId: form.id,
      key,
      label: v.label,
      type: v.type,
      required: v.required,
      options: v.options ?? undefined,
      maxFiles: v.maxFiles,
      order,
    },
    select: { id: true },
  });
  await audit(admin, "FIELD_ADDED", "FormField", field.id, {
    form: form.name,
    kolom: v.label,
    tipe: v.type,
    wajib: v.required,
  });
  refresh(form.id, form.slug);
  return { ok: true };
}

export async function updateField(
  input: { id: string } & FieldDraft
): Promise<ActionResult<{ draft: FieldDraft }>> {
  const admin = await requireAdminForAction();
  const parsed = normalizeFieldInput(input);
  if (!parsed.ok) return parsed;

  const field = await prisma.formField.findUnique({
    where: { id: input.id },
    include: { form: { select: { id: true, slug: true, name: true } }, _count: { select: { answers: true, files: true } } },
  });
  if (!field) return { ok: false, error: "Kolom tidak ditemukan." };

  const v = parsed.value;
  const hasData = field._count.answers + field._count.files > 0;
  if (hasData && v.type !== field.type) {
    return {
      ok: false,
      error: "Tipe kolom nggak bisa diubah karena sudah ada laporan yang mengisinya. Sembunyikan kolom ini lalu buat kolom baru.",
    };
  }

  await prisma.formField.update({
    where: { id: field.id },
    data: {
      label: v.label,
      type: v.type,
      required: v.required,
      options: v.options ?? Prisma.DbNull,
      maxFiles: v.maxFiles,
    },
  });

  const before = draftFromField({
    label: field.label,
    type: field.type,
    required: field.required,
    options: Array.isArray(field.options) ? field.options.filter((o): o is string => typeof o === "string") : [],
    maxFiles: field.maxFiles,
  });
  const after = draftFromField({ ...v, options: v.options ?? [] });
  const changes: Record<string, Change> = {};
  (Object.keys(after) as (keyof FieldDraft)[]).forEach((k) => {
    if (before[k] !== after[k]) changes[k] = [before[k], after[k]];
  });
  if (Object.keys(changes).length > 0) {
    await audit(admin, "FIELD_UPDATED", "FormField", field.id, { form: field.form.name, ...changes });
  }
  refresh(field.form.id, field.form.slug);
  return { ok: true, draft: after };
}

export async function setFieldActive(input: { id: string; isActive: boolean }): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  const field = await prisma.formField.findUnique({
    where: { id: input.id },
    include: { form: { select: { id: true, slug: true, name: true } } },
  });
  if (!field) return { ok: false, error: "Kolom tidak ditemukan." };

  const isActive = Boolean(input.isActive);
  if (field.isActive !== isActive) {
    await prisma.formField.update({ where: { id: field.id }, data: { isActive } });
    await audit(admin, isActive ? "FIELD_SHOWN" : "FIELD_HIDDEN", "FormField", field.id, {
      form: field.form.name,
      kolom: field.label,
    });
  }
  refresh(field.form.id, field.form.slug);
  return { ok: true };
}

export async function moveField(input: { id: string; direction: "up" | "down" }): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  const field = await prisma.formField.findUnique({
    where: { id: input.id },
    include: { form: { select: { id: true, slug: true, name: true } } },
  });
  if (!field) return { ok: false, error: "Kolom tidak ditemukan." };

  const all = await prisma.formField.findMany({
    where: { formId: field.formId },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true, label: true },
  });
  const from = all.findIndex((f) => f.id === field.id);
  const to = input.direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= all.length) return { ok: true };

  const next = [...all];
  [next[from], next[to]] = [next[to], next[from]];
  await prisma.$transaction(
    next.map((f, i) => prisma.formField.update({ where: { id: f.id }, data: { order: i + 1 } }))
  );
  await audit(admin, "FIELD_MOVED", "FormField", field.id, {
    form: field.form.name,
    kolom: field.label,
    arah: input.direction === "up" ? "naik" : "turun",
  });
  refresh(field.form.id, field.form.slug);
  return { ok: true };
}

export async function deleteField(input: { id: string }): Promise<ActionResult> {
  const admin = await requireAdminForAction();
  const field = await prisma.formField.findUnique({
    where: { id: input.id },
    include: { form: { select: { id: true, slug: true, name: true } }, _count: { select: { answers: true, files: true } } },
  });
  if (!field) return { ok: false, error: "Kolom tidak ditemukan." };
  if (field._count.answers + field._count.files > 0) {
    return { ok: false, error: "Kolom ini sudah punya data laporan, jadi nggak bisa dihapus. Sembunyikan saja." };
  }
  await prisma.formField.delete({ where: { id: field.id } });
  await audit(admin, "FIELD_DELETED", "FormField", field.id, { form: field.form.name, kolom: field.label });
  refresh(field.form.id, field.form.slug);
  return { ok: true };
}
