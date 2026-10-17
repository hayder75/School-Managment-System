import { useState, useEffect, useRef } from "react";

// Async searchable picker. `fetchOptions(query)` must return an array of
// { value, label, sub }.
export default function EntitySearch({ value, valueLabel, onChange, fetchOptions, placeholder, searchPlaceholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    if (!q.trim()) { setOpts([]); setLoading(false); return undefined; }
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetchOptions(q);
        if (alive) setOpts(res || []);
      } catch {
        if (alive) setOpts([]);
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setQ(""); }}
        className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-left disabled:opacity-60"
      >
        <span className={value ? "truncate" : "text-muted-foreground truncate"}>{valueLabel || placeholder}</span>
        <span className="text-muted-foreground text-xs ml-2">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-card shadow-lg">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder || "Search…"}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {loading && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
            {!loading && opts.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>}
            {opts.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => { onChange(o.value, o); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
              >
                <span className="font-medium">{o.label}</span>
                {o.sub ? <span className="text-muted-foreground text-xs"> · {o.sub}</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
