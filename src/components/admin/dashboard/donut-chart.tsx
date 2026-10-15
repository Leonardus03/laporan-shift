export type DonutItem = { id: string; name: string; count: number; pct: number; color: string };

export function DonutChart({ items, total }: { items: DonutItem[]; total: number }) {
  const size = 170;
  const r = 60;
  const stroke = 22;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label="Distribusi jenis laporan">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2ff" strokeWidth={stroke} />
          {total > 0 &&
            items.map((it) => {
              const len = (it.count / total) * c;
              const el = (
                <circle
                  key={it.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={it.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-slate-900">{total}</span>
          <span className="text-[10px] font-semibold tracking-widest text-slate-500">LAPORAN</span>
        </div>
      </div>

      <ul className="w-full space-y-3">
        {items.length === 0 && (
          <li className="text-center text-sm text-slate-500">Belum ada data pada periode ini.</li>
        )}
        {items.map((it) => (
          <li key={it.id}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-slate-700">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
                <span className="truncate">{it.name}</span>
              </span>
              <span className="shrink-0 font-semibold text-slate-800">
                {it.pct}% <span className="font-normal text-slate-500">({it.count})</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${it.pct}%`, backgroundColor: it.color }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
