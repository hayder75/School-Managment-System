import { formatEthiopian, formatGregorian } from "../../lib/ethiopianCalendar";

/**
 * Renders a date with the Ethiopian calendar primary and the Gregorian
 * calendar alongside. Pass `primary="gregorian"` to flip the order.
 *
 * Usage: <EthiopianDate date={student.date_of_birth} />
 *        -> "Meskerem 1, 2019 E.C. · Sep 11, 2026"
 */
export function EthiopianDate({ date, primary = "ethiopian", amharic = false, className = "", showGregorian = true, empty = "—" }) {
  if (date === null || date === undefined || date === "") return <span className={className}>{empty}</span>;
  const invalid = typeof date === "string" && Number.isNaN(new Date(date).getTime());
  if (invalid) return <span className={className}>{empty}</span>;

  const eth = formatEthiopian(date, { amharic });
  const greg = formatGregorian(date);

  if (primary === "gregorian") {
    return (
      <span className={className}>
        {greg}
        {showGregorian && <span className="text-muted-foreground"> · {eth}</span>}
      </span>
    );
  }
  return (
    <span className={className}>
      {eth}
      {showGregorian && <span className="text-muted-foreground"> · {greg}</span>}
    </span>
  );
}

export default EthiopianDate;
