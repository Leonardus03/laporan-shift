import type { DayPoint } from "@/lib/dashboard";
import { SHIFT_COLORS } from "./palette";

export function TrendChart({
  days,
  shifts,
}: {
  days: DayPoint[];
  shifts: { id: string; name: string }[];
}) {
  const W = 640;
  const H = 250;
  const padLeft = 30;
  const padRight = 10;
  const padTop = 16;
  const padBottom = 44;
  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;

  const maxTotal = Math.max(0, ...days.map((d) => d.total));
  const niceMax = Math.max(4, Math.ceil(maxTotal / 4) * 4);
  const slot = innerW / days.length;
  const barW = Math.min(40, slot * 0.6);
  const y = (v: number) => padTop + innerH - (v / niceMax) * innerH;
  const labelEvery = days.length > 14 ? 3 : days.length > 7 ? 2 : 1;
  const ticks = [0, 1, 2, 3, 4].map((i) => (niceMax / 4) * i);

  const points = days.map((d, i) => ({
    x: padLeft + slot * i + slot / 2,
    y: y(d.total),
  }));

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {shifts.map((s, i) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: SHIFT_COLORS[i % SHIFT_COLORS.length] }}
            />
            {s.name}
          </span>
        ))}
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafik tren volume laporan per shift">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={padLeft}
                x2={W - padRight}
                y1={y(t)}
                y2={y(t)}
                stroke="#e2e8f0"
                strokeDasharray="3 4"
              />
              <text x={padLeft - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
                {t}
              </text>
            </g>
          ))}

          {days.map((d, i) => {
            const cx = padLeft + slot * i + slot / 2;
            let acc = 0;
            return (
              <g key={d.key}>
                <title>{`${d.key}: ${d.total} laporan`}</title>
                {shifts.map((s, si) => {
                  const v = d.perShift[s.id] ?? 0;
                  if (v === 0) return null;
                  const top = y(acc + v);
                  const h = y(acc) - top;
                  acc += v;
                  return (
                    <rect
                      key={s.id}
                      x={cx - barW / 2}
                      y={top}
                      width={barW}
                      height={h}
                      fill={SHIFT_COLORS[si % SHIFT_COLORS.length]}
                    />
                  );
                })}
                {(i % labelEvery === 0 || d.isToday) && (
                  <>
                    <text
                      x={cx}
                      y={H - 24}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={d.isToday ? 700 : 400}
                      fill={d.isToday ? "#4338ca" : "#64748b"}
                    >
                      {d.label}
                    </text>
                    {d.isToday && (
                      <text x={cx} y={H - 10} textAnchor="middle" fontSize="9" fill="#4338ca">
                        Hari ini
                      </text>
                    )}
                  </>
                )}
              </g>
            );
          })}

          {maxTotal > 0 && (
            <>
              <polyline
                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p, i) => (
                <circle key={days[i].key} cx={p.x} cy={p.y} r="3" fill="#fff" stroke="#4f46e5" strokeWidth="2" />
              ))}
            </>
          )}
        </svg>

        {maxTotal === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="rounded-xl bg-white/90 px-4 py-2 text-sm text-slate-500">
              Belum ada laporan pada periode ini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
