"use client";

import { useState, useTransition } from "react";

type Result = { ok: true } | { ok: false; error: string };

export function useActionRunner() {
  const [pending, startTransition] = useTransition();
  const [which, setWhich] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function run<R extends Result>(
    name: string,
    action: () => Promise<R>,
    onSuccess?: (result: Extract<R, { ok: true }>) => string | void
  ) {
    setMessage(null);
    setWhich(name);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          const text = onSuccess?.(result as Extract<R, { ok: true }>);
          setMessage({ ok: true, text: text || "Tersimpan." });
        } else {
          setMessage({ ok: false, text: result.error });
        }
      } catch {
        setMessage({ ok: false, text: "Terjadi kesalahan. Periksa koneksi lalu coba lagi." });
      } finally {
        setWhich(null);
      }
    });
  }

  return { pending, which, message, setMessage, run };
}
