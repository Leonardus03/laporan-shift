import { AlertCircleIcon, CheckCircleIcon } from "@/components/ui/icons";

export function InlineMessage({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {ok ? (
        <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{children}</span>
    </p>
  );
}
