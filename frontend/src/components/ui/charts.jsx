export function BarChart({ data = [], height = 200, color = "#2c5a5e" }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground py-6 text-center">No data</p>;
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  const width = 100 / data.length;
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const h = ((Number(d.value) || 0) / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
            <span className="text-[10px] font-semibold text-muted-foreground">{Number(d.value) > 0 ? Math.round(d.value).toLocaleString() : ""}</span>
            <div
              title={`${d.label}: ${Number(d.value).toLocaleString()}`}
              className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
              style={{ height: `${Math.max(h, 2)}%`, backgroundColor: d.color || color }}
            />
            <span className="text-[10px] text-muted-foreground font-medium truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DonutChart({ total = 0, segments = [] }) {
  const sum = segments.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1;
  let cumulative = 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const segs = segments.map((s) => {
    const frac = (Number(s.value) || 0) / sum;
    const offset = cumulative;
    cumulative += frac;
    return { ...s, frac, offset };
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 180 180" className="w-40 h-40 shrink-0">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="24" />
        {segs.map((s, i) =>
          s.frac > 0 ? (
            <circle
              key={i}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth="24"
              strokeDasharray={`${s.frac * circumference} ${circumference}`}
              strokeDashoffset={-s.offset * circumference}
              transform="rotate(-90 90 90)"
              strokeLinecap="butt"
            />
          ) : null
        )}
        <text x="90" y="86" textAnchor="middle" className="fill-neutral-900 font-semibold" fontSize="26">{total.toLocaleString()}</text>
        <text x="90" y="104" textAnchor="middle" className="fill-neutral-400" fontSize="10">students</text>
      </svg>
      <div className="space-y-2">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground font-medium">{s.label}</span>
            <span className="font-semibold">{Number(s.value).toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">({(Number(s.value) / sum * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}