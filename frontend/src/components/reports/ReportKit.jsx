import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react";

export function StatCard({ label, value, unit = "", delta = null, icon: Icon, accent }) {
  const showDelta = delta !== null && delta !== undefined;
  const positive = showDelta && delta >= 0;
  const fmt = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "number") return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
    return v;
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" style={accent ? { color: accent } : undefined} />}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">
        {fmt(value)}
        {unit && <span className="text-sm font-medium text-muted-foreground ml-1">{unit}</span>}
      </p>
      {showDelta ? (
        <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-green-600" : "text-red-600"}`}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? "+" : ""}{delta}%
          <span className="text-muted-foreground font-normal">vs previous</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">&nbsp;</p>
      )}
    </div>
  );
}

export function Progress({ value, color = "#2c5a5e", label, right }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div>
      {(label || right) && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground font-medium">{label}</span>
          <span className="font-semibold">{right ?? `${pct}%`}</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function Insight({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
