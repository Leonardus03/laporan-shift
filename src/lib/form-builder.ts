import type { FieldType } from "@prisma/client";

export const FIELD_TYPES: FieldType[] = ["TEXT", "NUMBER", "DATE", "DROPDOWN", "CHECKBOX", "PHOTO"];

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  TEXT: "Teks",
  NUMBER: "Angka",
  DATE: "Tanggal",
  DROPDOWN: "Pilihan (dropdown)",
  CHECKBOX: "Centang (checkbox)",
  PHOTO: "Foto",
};

export const LIMITS = {
  nameMax: 60,
  descMax: 200,
  labelMax: 80,
  slugMin: 2,
  slugMax: 50,
  optionMax: 60,
  optionsMax: 30,
  photoMax: 10,
  fieldsMax: 40,
};

export type FieldDraft = {
  label: string;
  type: FieldType;
  required: boolean;
  optionsText: string;
  maxFiles: number;
};

export type NormalizedField = {
  label: string;
  type: FieldType;
  required: boolean;
  options: string[] | null;
  maxFiles: number | null;
};

function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// "Cuci Pallet Besar" -> "cuci-pallet-besar" (alamat web)
export function slugifyName(name: string) {
  return stripDiacritics(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITS.slugMax)
    .replace(/-+$/g, "");
}

export function validateSlug(slug: string): string | null {
  if (slug.length < LIMITS.slugMin || slug.length > LIMITS.slugMax) {
    return `Alamat harus ${LIMITS.slugMin} sampai ${LIMITS.slugMax} karakter.`;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return "Alamat hanya boleh huruf kecil, angka, dan tanda hubung (-).";
  }
  return null;
}

// "Type A (besar)" -> "type_a_besar" (nama internal kolom)
export function slugifyKey(label: string) {
  const base = stripDiacritics(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/g, "");
  return base || "kolom";
}

export function uniqueKey(base: string, taken: Set<string>) {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

export function parseOptions(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const v = line.trim().replace(/\s+/g, " ");
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function normalizeFieldInput(
  input: FieldDraft
): { ok: true; value: NormalizedField } | { ok: false; error: string } {
  const label = (input.label ?? "").trim().replace(/\s+/g, " ");
  if (!label) return { ok: false, error: "Nama kolom wajib diisi." };
  if (label.length > LIMITS.labelMax) {
    return { ok: false, error: `Nama kolom maksimal ${LIMITS.labelMax} karakter.` };
  }
  if (!FIELD_TYPES.includes(input.type)) return { ok: false, error: "Tipe kolom tidak valid." };

  let options: string[] | null = null;
  if (input.type === "DROPDOWN" || input.type === "CHECKBOX") {
    const list = parseOptions(input.optionsText ?? "");
    if (list.length > LIMITS.optionsMax) {
      return { ok: false, error: `Maksimal ${LIMITS.optionsMax} pilihan.` };
    }
    if (list.some((o) => o.length > LIMITS.optionMax)) {
      return { ok: false, error: `Tiap pilihan maksimal ${LIMITS.optionMax} karakter.` };
    }
    if (input.type === "DROPDOWN" && list.length < 2) {
      return { ok: false, error: "Dropdown butuh minimal 2 pilihan (satu pilihan per baris)." };
    }
    options = list.length > 0 ? list : null;
  }

  let maxFiles: number | null = null;
  if (input.type === "PHOTO") {
    const n = Math.trunc(Number(input.maxFiles));
    if (!Number.isFinite(n) || n < 1 || n > LIMITS.photoMax) {
      return { ok: false, error: `Jumlah foto maksimal harus 1 sampai ${LIMITS.photoMax}.` };
    }
    maxFiles = n;
  }

  return { ok: true, value: { label, type: input.type, required: Boolean(input.required), options, maxFiles } };
}

export function draftFromField(f: {
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
  maxFiles: number | null;
}): FieldDraft {
  return {
    label: f.label,
    type: f.type,
    required: f.required,
    optionsText: f.options.join("\n"),
    maxFiles: f.maxFiles ?? LIMITS.photoMax,
  };
}

export function draftsEqual(a: FieldDraft, b: FieldDraft) {
  return (
    a.label === b.label &&
    a.type === b.type &&
    a.required === b.required &&
    a.optionsText === b.optionsText &&
    a.maxFiles === b.maxFiles
  );
}
