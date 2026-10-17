"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/ui/spinner";

// Taruh DI DALAM <Link> yang berbentuk tombol: ikon berubah jadi spinner dan teks jadi "Membuka...".
export function LinkButtonLabel({
  icon,
  label,
  pendingLabel = "Membuka...",
}: {
  icon: React.ReactNode;
  label: string;
  pendingLabel?: string;
}) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? <Spinner className="h-4 w-4" /> : icon}
      {pending ? pendingLabel : label}
    </>
  );
}
