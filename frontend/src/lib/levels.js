// Canonical level labels shared across fee screens.
// grade_level alone is NOT unique (Nursery=0, LKG=1, Primary Grade 1=1),
// so levels are identified by level_group + grade_level.
const GROUP_ORDER = { nursery: 0, kg: 1, primary: 2, secondary: 3 };

export function levelKey(levelGroup, gradeLevel) {
  return `${levelGroup}:${gradeLevel}`;
}

export function levelLabel(levelGroup, gradeLevel) {
  if (levelGroup === "nursery") return "Nursery";
  if (levelGroup === "kg") {
    if (gradeLevel === 1) return "LKG";
    if (gradeLevel === 2) return "UKG";
    return `KG ${gradeLevel}`;
  }
  if (levelGroup === "primary" || levelGroup === "secondary") return `Grade ${gradeLevel}`;
  if (levelGroup) return `${levelGroup} ${gradeLevel}`;
  return gradeLevel === 0 ? "Grade 0" : `Grade ${gradeLevel}`;
}

// Build a unique, ordered list of levels from the classes list.
export function levelsFromClasses(classes) {
  const map = new Map();
  for (const c of classes || []) {
    if (c.grade_level === null || c.grade_level === undefined) continue;
    const lg = c.level_group || "primary";
    const key = levelKey(lg, c.grade_level);
    if (!map.has(key)) map.set(key, { key, level_group: lg, grade_level: Number(c.grade_level), label: levelLabel(lg, c.grade_level) });
  }
  return [...map.values()].sort((a, b) => {
    const ga = GROUP_ORDER[a.level_group] ?? 9;
    const gb = GROUP_ORDER[b.level_group] ?? 9;
    return ga - gb || a.grade_level - b.grade_level;
  });
}
