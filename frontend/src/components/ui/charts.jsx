export function BarChart({ data = [], height = 200, color = "#2c5a5e" }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground py-6 text-center">No data</p>;
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  const width = 100 / data.length;
  const needsScroll = data.length > 6;
  return (
    <div className={needsScroll ? "overflow-x-auto pb-1" : ""}>
    <div className="flex items-end gap-2" style={{ height, minWidth: needsScroll ? data.length * 56 : undefined }}>
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
    </div>
  );
}

export function GroupedBarChart({ data = [], series = [], height = 220 }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground py-6 text-center">No data</p>;
  const max = Math.max(...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)), 1);
  const needsScroll = data.length * series.length > 10;
  return (
    <div className={needsScroll ? "overflow-x-auto pb-1" : ""}>
    <div className="flex items-end gap-1.5" style={{ height, minWidth: needsScroll ? data.length * series.length * 40 : undefined }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
          <div className="flex items-end gap-0.5 w-full justify-center">
            {series.map((s) => {
              const v = Number(d[s.key]) || 0;
              return (
                <div
                  key={s.key}
                  title={`${d.label}: ${s.label} ${Math.round(v).toLocaleString()}`}
                  className="w-1/2 rounded-t-md transition-all duration-300 hover:opacity-80"
                  style={{ height: `${(v / max) * 100}%`, backgroundColor: s.color, minHeight: v > 0 ? 4 : 0 }}
                />
              );
            })}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
    </div>
  );
}

export function DonutChart({ total = 0, segments = [], caption = "students" }) {  const sum = segments.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1;
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
    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 sm:gap-6">
      <svg viewBox="0 0 180 180" className="w-36 h-36 sm:w-40 sm:h-40 shrink-0">
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
        <text x="90" y="104" textAnchor="middle" className="fill-neutral-400" fontSize="10">{caption}</text>
      </svg>
      <div className="space-y-2 text-center sm:text-left">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center justify-center sm:justify-start gap-2 text-sm">
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