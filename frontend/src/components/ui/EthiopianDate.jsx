import { formatEthiopian, formatGregorian } from "../../lib/ethiopianCalendar";
import { useCalendarStore } from "../../store/calendar";

/**
 * Renders a date honouring the tenant calendar preference:
 *   "ethiopian" -> "Meskerem 1, 2019 E.C."
 *   "gregorian" -> "Sep 11, 2026"
 *   "both"      -> "Meskerem 1, 2019 E.C. · Sep 11, 2026" (default)
 *
 * Props `primary` and `showGregorian` override the tenant preference when set.
 */
export function EthiopianDate({
  date,
  primary,
  amharic = false,
  className = "",
  showGregorian,
  empty = "—",
}) {
  const setting = useCalendarStore((s) => s.calendar);

  if (date === null || date === undefined || date === "") return <span className={className}>{empty}</span>;
  const invalid = typeof date === "string" && Number.isNaN(new Date(date).getTime());
  if (invalid) return <span className={className}>{empty}</span>;

  const effectivePrimary = primary ?? (setting === "gregorian" ? "gregorian" : "ethiopian");
  const effectiveShowGregorian = showGregorian ?? setting === "both";

  const eth = formatEthiopian(date, { amharic });
  const greg = formatGregorian(date);

  if (effectivePrimary === "gregorian") {
    return (
      <span className={className}>
        {greg}
        {effectiveShowGregorian && <span className="text-muted-foreground"> · {eth}</span>}
      </span>
    );
  }
  return (
    <span className={className}>
      {eth}
      {effectiveShowGregorian && <span className="text-muted-foreground"> · {greg}</span>}
    </span>
  );
}

export default EthiopianDate;
