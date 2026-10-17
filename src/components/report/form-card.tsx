"use client";

import { useLinkStatus } from "next/link";
import { ArrowRightIcon, DocumentIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";

// Isi kartu jenis laporan. Taruh DI DALAM <Link>: berubah jadi status "Membuka form..." saat diklik.
export function FormCardContent({
  name,
  description,
}: {
  name: string;
  description: string | null;
}) {
  const { pending } = useLinkStatus();

  return (
    <span
      className={`relative flex items-center gap-4 overflow-hidden rounded-3xl p-5 transition ${
        pending ? "bg-indigo-50/70" : ""
      }`}
      aria-busy={pending}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        {pending ? <Spinner className="h-6 w-6" /> : <DocumentIcon className="h-6 w-6" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold text-slate-900">{name}</span>
        {pending ? (
          <span className="block text-sm font-medium text-indigo-600">Membuka form...</span>
        ) : (
          description && <span className="block truncate text-sm text-slate-500">{description}</span>
        )}
      </span>
      {!pending && <ArrowRightIcon className="h-5 w-5 shrink-0 text-indigo-500" />}
      {pending && (
        <span className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-indigo-500" aria-hidden="true" />
      )}
    </span>
  );
}
