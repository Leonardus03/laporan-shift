type Accent = "indigo" | "violet" | "red" | "emerald";

const ACCENT: Record<Accent, { bar: string; icon: string }> = {
  indigo: { bar: "border-b-indigo-600", icon: "bg-indigo-50 text-indigo-600" },
  violet: { bar: "border-b-violet-500", icon: "bg-violet-50 text-violet-600" },
  red: { bar: "border-b-red-500", icon: "bg-red-50 text-red-600" },
  emerald: { bar: "border-b-emerald-500", icon: "bg-emerald-50 text-emerald-600" },
};

export function StatCard({
  title,
  value,
  unit,
  icon,
  accent,
  footer,
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  accent: Accent;
  footer?: React.ReactNode;
}) {
  const a = ACCENT[accent];
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border-b-4 bg-white p-4 shadow-sm ring-1 ring-slate-100 ${a.bar}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.icon}`}>
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl font-extrabold tracking-tight text-slate-900">{value}</span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
      {footer && <div className="mt-3 text-xs text-slate-500">{footer}</div>}
    </div>
  );
}
