import { cn } from "../../lib/utils";

const PALETTES = [
  "from-teal-500 to-emerald-600",
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
  "from-lime-500 to-green-600",
  "from-fuchsia-500 to-pink-600",
  "from-sky-500 to-blue-600",
  "from-red-500 to-rose-600",
];

function hash(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function StudentAvatar({ student, name, className, ring = true }) {
  const full = name || (student?.first_name && student?.last_name)
    ? `${student?.first_name || ""} ${student?.last_name || ""}`.trim()
    : student?.student_number || "?";
  const palette = PALETTES[hash(student?.user_id || student?.id || full) % PALETTES.length];
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br text-white font-bold flex items-center justify-center shrink-0 select-none",
        palette,
        ring && "ring-2 ring-white shadow",
        className || "w-10 h-10 text-sm"
      )}
      title={`${full}${student?.student_number ? ` · ${student.student_number}` : ""}`}
    >
      {initials(full)}
    </div>
  );
}