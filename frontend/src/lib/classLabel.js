// Format a class for display without duplicating the section.
// Class names usually already contain the section (e.g. "Grade 1 A"), so we
// only append the section when it is not already part of the name.
export function classLabel(c) {
  if (!c) return "";
  const name = String(c.name || "").trim();
  const section = String(c.section || "").trim();
  if (!section) return name;
  const esc = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(^|\\s)${esc}$`, "i").test(name)) return name;
  if (!name) return section;
  return `${name} · ${section}`;
}
