"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { AlertCircleIcon, CameraIcon, CloseIcon } from "@/components/ui/icons";
import {
  BLOB_ACCESS,
  MAX_PHOTO_BYTES,
  UPLOAD_PREFIX,
  type UploadedFile,
} from "@/lib/report-config";

export type PhotoState = { files: UploadedFile[]; busy: boolean };

type Item = {
  id: string;
  name: string;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  progress: number;
  error?: string;
  uploaded?: UploadedFile;
};

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

const EXT_TO_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function makeId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function guessType(file: File) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_TYPE[ext] ?? "";
}

// Perkecil foto besar dari kamera HP supaya upload cepat. Kalau gagal, pakai file asli.
async function compressImage(file: File): Promise<File> {
  const type = guessType(file);
  if (type !== "image/jpeg" && type !== "image/png" && type !== "image/webp") return file;
  if (file.size < 1_000_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 2000;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function PhotoField({
  slug,
  label,
  maxFiles,
  onChange,
}: {
  slug: string;
  label: string;
  maxFiles: number;
  onChange: (state: PhotoState) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange({
      files: items.flatMap((i) => (i.status === "done" && i.uploaded ? [i.uploaded] : [])),
      busy: items.some((i) => i.status === "uploading"),
    });
  }, [items, onChange]);

  function patch(id: string, change: Partial<Item>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...change } : i)));
  }

  async function processFile(file: File, id: string) {
    try {
      const prepared = await compressImage(file);
      const type = guessType(prepared);
      const ext = EXT_BY_TYPE[type];
      if (!ext) throw new Error("Format foto tidak didukung (pakai JPG, PNG, WEBP, atau HEIC).");
      if (prepared.size > MAX_PHOTO_BYTES) throw new Error("Ukuran foto terlalu besar (maksimal 25 MB).");

      const pathname = `${UPLOAD_PREFIX}${slug}/${makeId()}.${ext}`;
      const blob = await upload(pathname, prepared, {
        access: BLOB_ACCESS,
        handleUploadUrl: "/api/upload",
        contentType: type,
        onUploadProgress: ({ percentage }) => patch(id, { progress: Math.round(percentage) }),
      });
      patch(id, {
        status: "done",
        progress: 100,
        uploaded: {
          url: blob.url,
          pathname: blob.pathname,
          mimeType: blob.contentType,
          sizeBytes: prepared.size,
        },
      });
    } catch (error) {
      patch(id, {
        status: "error",
        error: error instanceof Error ? error.message : "Upload gagal. Coba lagi.",
      });
    }
  }

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;

    const slots = Math.max(0, maxFiles - items.length);
    const accepted = selected.slice(0, slots);
    setNotice(
      selected.length > slots ? `Maksimal ${maxFiles} foto. Sebagian foto tidak ditambahkan.` : null
    );
    if (accepted.length === 0) return;

    const created = accepted.map((file) => ({
      file,
      item: {
        id: makeId(),
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        status: "uploading" as const,
        progress: 0,
      } satisfies Item,
    }));
    setItems((prev) => [...prev, ...created.map((c) => c.item)]);

    for (const c of created) {
      await processFile(c.file, c.item.id);
    }
  }

  function remove(id: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  const full = items.length >= maxFiles;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleSelect}
        className="hidden"
        aria-label={label}
      />

      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((i) => (
            <li
              key={i.id}
              className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.previewUrl} alt={i.name} className="h-full w-full object-cover" />
              {i.status === "uploading" && (
                <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 p-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/30">
                    <div className="h-full bg-white" style={{ width: `${i.progress}%` }} />
                  </div>
                </div>
              )}
              {i.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-900/70 p-1 text-center text-[10px] text-white">
                  <AlertCircleIcon className="h-5 w-5" />
                  <span className="line-clamp-3">{i.error}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(i.id)}
                aria-label={`Hapus ${i.name}`}
                className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white hover:bg-slate-900"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={full}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CameraIcon className="h-5 w-5" />
        {items.length === 0 ? "Ambil atau pilih foto" : "Tambah foto"}
        <span className="font-normal text-indigo-500">
          ({items.length}/{maxFiles})
        </span>
      </button>

      {notice && <p className="text-xs text-amber-600">{notice}</p>}
    </div>
  );
}
