import { PublicShell } from "@/components/report/public-shell";

function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-3xl bg-slate-200/70 ${className}`} />;
}

export default function Loading() {
  return (
    <PublicShell backHref="/">
      <div className="space-y-4" aria-busy="true" aria-label="Memuat form laporan">
        <Block className="h-9 w-2/3 rounded-xl" />
        <Block className="h-72" />
        <Block className="h-56" />
        <Block className="h-48" />
        <Block className="h-14" />
      </div>
    </PublicShell>
  );
}
