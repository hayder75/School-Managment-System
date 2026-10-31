export default function Chips({ options, value, onChange, emptyLabel }) {
  if (!options.length) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(active ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
