"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@/components/ui/spinner";

// Taruh DI DALAM <Link>. Muncul spinner kecil selama halaman tujuan dimuat.
export function LinkPending({ className = "h-3.5 w-3.5" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className={className} /> : null;
}

// Taruh DI DALAM <Link>. Isi link diganti spinner selama halaman tujuan dimuat.
export function LinkLabel({
  children,
  className = "h-4 w-4",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className={className} /> : <>{children}</>;
}
