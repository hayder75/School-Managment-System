// Full Ethiopian name: first + middle + last. Skip blanks, so it also works
// when a person has no middle or last name (e.g. archived students).
export function fullName(u) {
  if (!u) return "";
  return [u.first_name, u.middle_name, u.last_name]
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean)
    .join(" ");
}