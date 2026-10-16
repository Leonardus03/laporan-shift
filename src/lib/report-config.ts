export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const DEFAULT_MAX_FILES = 10;
export const UPLOAD_PREFIX = "laporan/";

// Harus sama dengan jenis akses Blob store yang dibuat di Vercel.
export const BLOB_ACCESS = "public" as const;

export type UploadedFile = {
  url: string;
  pathname: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type FieldType = "TEXT" | "NUMBER" | "DATE" | "DROPDOWN" | "CHECKBOX" | "PHOTO";

export type FieldDef = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
  maxFiles: number;
};

export type FieldValue = string | string[] | boolean | UploadedFile[];

export type SubmitPayload = {
  slug: string;
  reporterName: string;
  reportDate: string;
  shiftId: string;
  values: Record<string, FieldValue>;
};

export type SubmitResult = { ok: true; shortId: string } | { ok: false; error: string };
