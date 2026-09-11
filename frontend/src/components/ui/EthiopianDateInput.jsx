import { useEffect, useMemo, useState } from "react";
import {
  ETHIOPIAN_MONTHS,
  toEthiopian,
  toGregorian,
  daysInEthiopianMonth,
  formatGregorian,
} from "../../lib/ethiopianCalendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

function isoOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Ethiopian calendar date input (month names + day + year).
 * Emits a canonical Gregorian ISO "YYYY-MM-DD" string via onChange so the
 * database always stores Gregorian dates.
 */
export function EthiopianDateInput({ value, onChange, disabled = false, className = "" }) {
  const todayEth = useMemo(() => toEthiopian(new Date()), []);
  const [parts, setParts] = useState(() => {
    const e = value ? toEthiopian(value) : null;
    return e ? { year: e.year, month: e.month, day: e.day } : { year: todayEth.year, month: 1, day: 1 };
  });
  const [hasValue, setHasValue] = useState(!!value);

  useEffect(() => {
    if (!value) return;
    const e = toEthiopian(value);
    if (e) {
      setParts({ year: e.year, month: e.month, day: e.day });
      setHasValue(true);
    }
  }, [value]);

  function emit(next) {
    setParts(next);
    setHasValue(true);
    onChange(isoOf(toGregorian(next.year, next.month, next.day)));
  }

  const maxDay = daysInEthiopianMonth(parts.year, parts.month);
  const day = Math.min(parts.day, maxDay);
  const years = useMemo(() => {
    const arr = [];
    for (let y = todayEth.year + 1; y >= todayEth.year - 100; y--) arr.push(y);
    return arr;
  }, [todayEth.year]);

  const greg = hasValue ? formatGregorian(toGregorian(parts.year, parts.month, day)) : "—";

  return (
    <div className={className}>
      <div className="flex gap-1.5">
        <Select
          value={hasValue ? String(parts.month) : ""}
          onValueChange={(v) => {
            const m = Number(v);
            emit({ ...parts, month: m, day: Math.min(day, daysInEthiopianMonth(parts.year, m)) });
          }}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1"><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            {ETHIOPIAN_MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={hasValue ? String(day) : ""}
          onValueChange={(v) => emit({ ...parts, day: Number(v) })}
          disabled={disabled}
        >
          <SelectTrigger className="w-20"><SelectValue placeholder="Day" /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={hasValue ? String(parts.year) : ""}
          onValueChange={(v) => emit({ ...parts, year: Number(v) })}
          disabled={disabled}
        >
          <SelectTrigger className="w-28"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">{hasValue ? `E.C. · ${greg}` : "Pick an Ethiopian date"}</p>
    </div>
  );
}

export default EthiopianDateInput;
