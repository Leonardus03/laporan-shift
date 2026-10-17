"use client";

import { useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  AlertCircleIcon,
  CameraIcon,
  CheckCircleIcon,
  CloseIcon,
  ImageIcon,
} from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { PhotoLightbox } from "./photo-lightbox";
import {
  BLOB_ACCESS,
  MAX_PHOTO_BYTES,
  UPLOAD_PREFIX,
  type UploadedFile,
} from "@/lib/report-config";

export type PhotoState = {
  files: UploadedFile[];
  total: number;
  done: number;
  uploading: number;
  failed: number;
};

type Item = {
  id: string;
  file: File;
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
  const [viewer, setViewer] = useState<number | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onChange({
      files: items.flatMap((i) => (i.status === "done" && i.uploaded ? [i.uploaded] : [])),
      total: items.length,
      done: items.filter((i) => i.status === "done").length,
      uploading: items.filter((i) => i.status === "uploading").length,
      failed: items.filter((i) => i.status === "error").length,
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
      id: makeId(),
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      status: "uploading" as const,
      progress: 0,
    }));
    setItems((prev) => [...prev, ...created]);

    for (const c of created) {
      await processFile(c.file, c.id);
    }
  }

  function retry(item: Item) {
    patch(item.id, { status: "uploading", progress: 0, error: undefined });
    void processFile(item.file, item.id);
  }

  function remove(id: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
    setNotice(null);
  }

  const full = items.length >= maxFiles;
  const uploadingCount = items.filter((i) => i.status === "uploading").length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const failedCount = items.filter((i) => i.status === "error").length;

  return (
    <div className="space-y-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleSelect}
        className="hidden"
        aria-label={`${label} (kamera)`}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleSelect}
        className="hidden"
        aria-label={`${label} (galeri)`}
      />

      {items.length > 0 && (
        <>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((i, idx) => (
              <li
                key={i.id}
                className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"
              >
                <button
                  type="button"
                  onClick={() => setViewer(idx)}
                  aria-label={`Perbesar foto ${idx + 1}`}
                  className="absolute inset-0 block h-full w-full cursor-zoom-in"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.previewUrl} alt={i.name} className="h-full w-full object-cover" />
                </button>

                {i.status === "uploading" && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-900/55 text-white">
                    <Spinner className="h-6 w-6" />
                    <span className="text-xs font-semibold">{i.progress}%</span>
                    <div className="absolute inset-x-2 bottom-2 h-1.5 overflow-hidden rounded-full bg-white/30">
                      <div
                        className="h-full bg-white transition-all"
                        style={{ width: `${i.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {i.status === "done" && (
                  <span className="pointer-events-none absolute bottom-1 left-1 rounded-full bg-white/90 p-0.5 text-emerald-600 shadow">
                    <CheckCircleIcon className="h-5 w-5" />
                  </span>
                )}

                {i.status === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-900/80 p-1.5 text-center text-white">
                    <AlertCircleIcon className="h-5 w-5" />
                    <span className="line-clamp-2 text-[10px] leading-tight">{i.error}</span>
                    <button
                      type="button"
                      onClick={() => retry(i)}
                      className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                    >
                      Coba lagi
                    </button>
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
          <p className="text-xs text-slate-400">Ketuk foto untuk memperbesar.</p>
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={full}
          onClick={() => cameraRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-3 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CameraIcon className="h-5 w-5" />
          Buka Kamera
        </button>
        <button
          type="button"
          disabled={full}
          onClick={() => galleryRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/60 px-3 py-3.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImageIcon className="h-5 w-5" />
          Pilih dari Galeri
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {items.length} dari {maxFiles} foto
        {full && " • batas foto tercapai"}
      </p>

      {uploadingCount > 0 && (
        <p className="flex items-center gap-2 text-sm text-indigo-600">
          <Spinner />
          Mengunggah foto... {doneCount} dari {items.length} selesai
        </p>
      )}
      {uploadingCount === 0 && failedCount > 0 && (
        <p className="text-sm text-red-600">
          {failedCount} foto gagal diunggah. Tekan &quot;Coba lagi&quot; pada foto itu, atau hapus.
        </p>
      )}
      {uploadingCount === 0 && failedCount === 0 && doneCount > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircleIcon className="h-4 w-4" />
          {doneCount} foto siap dikirim
        </p>
      )}
      {notice && <p className="text-xs text-amber-600">{notice}</p>}

      {viewer !== null && items.length > 0 && (
        <PhotoLightbox
          images={items.map((i) => ({ src: i.previewUrl, name: i.name }))}
          index={viewer}
          onClose={() => setViewer(null)}
          onIndexChange={setViewer}
        />
      )}
    </div>
  );
}
