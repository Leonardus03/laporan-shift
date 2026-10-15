import type { ReportStatus } from "@prisma/client";

const STATUS: Record<ReportStatus, { label: string; className: string }> = {
  REVIEWED: { label: "Selesai", className: "bg-emerald-100 text-emerald-700" },
  SUBMITTED: { label: "Menunggu Review", className: "bg-slate-100 text-slate-600" },
  REJECTED: { label: "Ditolak", className: "bg-red-100 text-red-700" },
};

export function statusLabel(status: ReportStatus) {
  return STATUS[status].label;
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  const s = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${s.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
