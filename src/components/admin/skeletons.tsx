function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat dashboard">
      <Block className="h-24" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Block className="h-36" />
        <Block className="h-36" />
        <Block className="h-36" />
        <Block className="h-36" />
      </div>
      <Block className="h-24" />
      <div className="grid gap-5 lg:grid-cols-5">
        <Block className="h-80 lg:col-span-3" />
        <Block className="h-80 lg:col-span-2" />
      </div>
      <Block className="h-96" />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat daftar laporan">
      <Block className="h-16 w-1/2" />
      <Block className="h-[32rem]" />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat detail laporan">
      <Block className="h-5 w-48" />
      <Block className="h-48" />
      <Block className="h-40" />
      <Block className="h-64" />
    </div>
  );
}
