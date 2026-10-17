"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui/spinner";

// Tombol submit untuk <form action={serverAction}>: otomatis nonaktif + spinner saat diproses.
export function SubmitButton({
  children,
  pendingText,
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending, data } = useFormStatus();
  const mine = pending && (!name || data?.get(name) === value);

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {mine ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
