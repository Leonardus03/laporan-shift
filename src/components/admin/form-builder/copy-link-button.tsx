"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon } from "@/components/ui/icons";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Salin link ini:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition active:scale-[0.97] ${
        copied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {copied && <CheckCircleIcon className="h-4 w-4" />}
      {copied ? "Link tersalin" : "Salin link"}
    </button>
  );
}
