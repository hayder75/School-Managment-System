// Parent accounts are imported without names (only a phone number), so the
// system derives a display name from the linked student. This is the single
// place that rule lives, and it mirrors the `guardian_name` derivation used by
// the parents list.

// Given a child's user row, produce the parent's name fields using the
// Ethiopian guardian convention: the child's middle name is usually the
// parent's given name, and the child's last name is the family name.
function deriveParentName(child) {
  if (!child) return { first_name: '', last_name: '' };
  const middle = (child.middle_name || '').trim();
  const first = (child.first_name || '').trim();
  const last = (child.last_name || '').trim();
  return { first_name: middle || first, last_name: last };
}

// Human label for any user row, with a safe fallback so avatars and lists
// never render an empty name.
function displayName(user) {
  if (!user) return '';
  const n = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (n) return n;
  return (user.phone || user.username || '').trim();
}

module.exports = { deriveParentName, displayName };