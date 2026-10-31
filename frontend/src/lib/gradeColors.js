// Shared colour coding so every screen speaks the same language:
//   good  → green
//   warn  → amber
//   danger→ red
//   neutral→ grey
// Always pair colour with a label or icon (prints in black & white, and is
// friendlier for colour-blind users).

export const SEVERITY = {
  good: {
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
  },
  warn: {
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-300",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
  },
  danger: {
    text: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-300",
    badge: "bg-rose-100 text-rose-800",
    dot: "bg-rose-500",
  },
  neutral: {
    text: "text-muted-foreground",
    bg: "bg-muted/40",
    border: "border-border",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  info: {
    text: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-300",
    badge: "bg-blue-100 text-blue-800",
    dot: "bg-blue-500",
  },
};

export function classes(severity) {
  return SEVERITY[severity] || SEVERITY.neutral;
}

/** Severity for a raw mark against the exam total / pass mark. */
export function markSeverity(marks, total, pass, { nearPass = 0.05 } = {}) {
  if (marks === null || marks === undefined || marks === "") return "empty";
  const m = Number(marks);
  const t = Number(total);
  if (!Number.isFinite(m)) return "neutral";
  if (Number.isFinite(t) && t > 0 && m > t) return "danger";
  if (m < 0) return "danger";
  if (!Number.isFinite(t) || t <= 0) return "neutral";
  const pct = (m / t) * 100;
  const passPct = Number.isFinite(Number(pass)) && Number(pass) >= 0 ? (Number(pass) / t) * 100 : 50;
  if (pct >= 80) return "good";
  if (pct >= passPct * (1 + nearPass)) return "info";
  if (pct >= passPct) return "warn";
  return "danger";
}

export function severityForMark(marks, total, pass) {
  const key = markSeverity(marks, total, pass);
  return key === "empty" ? "neutral" : key;
}

/** Severity for a percentage (attendance rate, pass rate, coverage…). */
export function percentSeverity(pct, { warn = 85, good = 95 } = {}) {
  const p = Number(pct);
  if (!Number.isFinite(p)) return "neutral";
  if (p >= good) return "good";
  if (p >= warn) return "warn";
  return "danger";
}

/** Severity for "is this number inside a valid range?" checks. */
export function rangeSeverity(value, min, max) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "neutral";
  if (Number.isFinite(min) && v < min) return "danger";
  if (Number.isFinite(max) && v > max) return "danger";
  return "good";
}

/** A confirmed/approved status colour. */
export function statusSeverity(status) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
    case "good":
    case "present":
      return "good";
    case "submitted":
    case "pending":
    case "partially_approved":
      return "info";
    case "returned":
    case "editing":
    case "late":
    case "needs_revision":
      return "warn";
    case "rejected":
    case "absent":
    case "expired":
      return "danger";
    default:
      return "neutral";
  }
}
