"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, SearchIcon } from "@/components/ui/icons";

export type LightboxImage = { src: string; name: string };

export function PhotoLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const safeIndex = Math.min(Math.max(index, 0), images.length - 1);
  const current = images[safeIndex];

  function go(next: number) {
    if (next < 0 || next >= images.length) return;
    setZoomed(false);
    onIndexChange(next);
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowLeft") go(safeIndex - 1);
    else if (e.key === "ArrowRight") go(safeIndex + 1);
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    document.addEventListener("keydown", handler);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau foto"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <span className="min-w-0 truncate text-sm">
          {safeIndex + 1} / {images.length}
          <span className="ml-2 hidden text-slate-400 sm:inline">{current.name}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            aria-pressed={zoomed}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition ${
              zoomed ? "bg-white text-slate-900" : "bg-white/15 hover:bg-white/25"
            }`}
          >
            <SearchIcon className="h-4 w-4" />
            {zoomed ? "Perkecil" : "Perbesar"}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full bg-white/15 p-2 hover:bg-white/25"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 overflow-auto"
        style={{ touchAction: "pan-x pan-y pinch-zoom" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt={current.name}
          onClick={() => setZoomed((z) => !z)}
          className={`m-auto select-none transition-[width] duration-200 ${
            zoomed
              ? "w-[220%] max-w-none cursor-zoom-out"
              : "max-h-[calc(100dvh-5rem)] max-w-full cursor-zoom-in object-contain"
          }`}
        />
      </div>

      {images.length > 1 && !zoomed && (
        <>
          <button
            type="button"
            onClick={() => go(safeIndex - 1)}
            disabled={safeIndex === 0}
            aria-label="Foto sebelumnya"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur hover:bg-white/30 disabled:opacity-30"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => go(safeIndex + 1)}
            disabled={safeIndex === images.length - 1}
            aria-label="Foto berikutnya"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white backdrop-blur hover:bg-white/30 disabled:opacity-30"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
}
