/* eslint-disable no-console */
/**
 * Patch: rebuild teacher_subjects assignments for Mount Olive School in place.
 *
 * The original seed only created teacher_subjects when a staff member's free-text
 * "subject" exactly matched a seeded subject name and had a parsable class list.
 * This left most KG staff and many primary teachers with zero assignments even
 * though the source spreadsheets (data/*.xlsx) contain valid assignments.
 *
 * This script re-runs the assignment logic from seed-mount-olive.js (with subject
 * aliases + multi-subject + KG "self content" support) using deterministic uid()
 * keys, so results match a fresh seed, without wiping the rest of the database.
 *
 * Usage: node scripts/patch-teacher-assignments.js
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const knex = require('knex')(require('../src/database/knexfile').development);

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'parsed');
const TID = '00000000-0000-0000-0000-000000000001';

function uid(seed) {
  const hex = crypto.createHash('md5').update(String(seed)).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

function parseGrades(classesStr) {
  if (!classesStr) return [];
  const s = String(classesStr);
  const grades = [];
  for (let g = 1; g <= 8; g++) grades.push(g);
  return grades.filter((g) => s.includes(String(g)));
}

const SUBJECT_ALIASES = {
  maths: ['Mathematics'],
  math: ['Mathematics'],
  amhric: ['Amharic'],
  amharic: ['Amharic'],
  sci: ['Science'],
  science: ['Science'],
  english: ['English'],
  spokenenglish: ['Spoken English'],
  sport: ['Sport'],
  ict: ['ICT'],
  sidamuaafo: ['Sidamu Afo'],
  pva: ['Performing Visual Arts'],
  art: ['Art & Aesthetics'],
  handcraft: ['Hand Craft'],
  moralcitizen: ['Moral & Social'],
  moralsocial: ['Moral & Social'],
  'moral&social': ['Moral & Social'],
  selfcontent: ['KG (General)'], // KG: single general subject for their classes
  assist: ['KG (General)'],
  babysitter: ['KG (General)'],
};

async function main() {
  // ── Load source data identical to the seed ──
  const staff = load('staff.json');
  const enrollPrimary = load('enroll_primary.json');
  const enrollKg = load('enroll_kg.json');

  const staffByNorm = new Map();
  function ensureStaff(name, opts = {}) {
    if (!name) return null;
    const key = norm(name);
    if (staffByNorm.has(key)) {
      const existing = staffByNorm.get(key);
      if (opts.subject) existing.subject = existing.subject || opts.subject;
      if (opts.classes) existing.classes = existing.classes || opts.classes;
      return existing;
    }
    const rec = {
      name, subject: opts.subject || '', classes: opts.classes || '',
      role: opts.role || 'support',
    };
    staffByNorm.set(key, rec);
    return rec;
  }
  for (const m of staff.management) ensureStaff(m.name, { role: 'admin', subject: m.subject });
  for (const t of staff.primary_teachers) ensureStaff(t.name, { role: 'teacher', subject: t.subject, classes: t.classes });
  for (const t of staff.kg_staff) ensureStaff(t.name, { role: 'teacher', subject: t.subject, classes: t.classes });
  for (const s of staff.supportive) ensureStaff(s.name, { role: 'support', subject: s.subject, classes: s.classes });

  // ── Classes (same scheme as seed) ──
  const classKey = (levelGroup, section) => `${levelGroup}|${section}`;
  const classMap = new Map();
  const GRADE_MAP = {
    Nursery: { level_group: 'nursery', grade_level: 0 },
    LKG: { level_group: 'kg', grade_level: 1 },
    UKG: { level_group: 'kg', grade_level: 2 },
  };
  function ensureClass(gradeLabel, section) {
    const meta = GRADE_MAP[gradeLabel];
    const key = classKey(gradeLabel, section);
    if (classMap.has(key)) return classMap.get(key);
    const rec = {
      id: uid(`class-${gradeLabel}-${section}`),
      name: `${gradeLabel} ${section}`.trim(),
      grade_level: meta ? meta.grade_level : parseInt(gradeLabel.replace('Grade ', ''), 10),
      level_group: meta ? meta.level_group : 'primary',
    };
    classMap.set(key, rec);
    return rec;
  }
  for (const e of enrollKg) if (e.grade_level && e.section) ensureClass(e.grade_level, e.section);
  for (const e of enrollPrimary) if (e.grade_level && e.section) ensureClass(e.grade_level, e.section);

  const subjectRows = await knex('subjects').where({ tenant_id: TID }).select('id', 'name');
  const kgSubject = subjectRows.find((s) => norm(s.name) === 'kg(general)');
  if (!kgSubject) {
    const newSubjects = [
      { name: 'KG (General)', code: 'KG' },
    ];
    for (const s of newSubjects) {
      const sid = uid(`subject-${s.code}`);
      try {
        await knex('subjects').insert({
          id: sid, tenant_id: TID, name: s.name, code: s.code, is_active: true,
        });
      } catch (e) {
        if (!String(e.message).includes('duplicate')) throw e;
      }
      subjectRows.push({ id: sid, name: s.name });
    }
    console.log('  added missing KG (General) subject');
  }
  const subjectIdByName = new Map(subjectRows.map((s) => [norm(s.name), s.id]));
  const subjectNameList = subjectRows.map((s) => s.name);

  function subjNames(subjectStr) {
    if (!subjectStr) return [];
    const normalized = norm(subjectStr);
    if (SUBJECT_ALIASES[normalized] === null) return ['__ALL__'];
    if (SUBJECT_ALIASES[normalized]) return SUBJECT_ALIASES[normalized];
    if (subjectNameList.some((r) => norm(r) === normalized)) return [subjectStr];
    const parts = String(subjectStr).split(/[&/]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      const mapped = [];
      for (const p of parts) {
        const pn = norm(p);
        if (SUBJECT_ALIASES[pn]) mapped.push(...SUBJECT_ALIASES[pn]);
        else if (subjectNameList.some((r) => norm(r) === pn)) mapped.push(p);
        else mapped.push(pn);
      }
      return mapped.length ? mapped : [subjectStr];
    }
    return [subjectStr];
  }

  // ── Resolve teacher user ids ──
  const users = await knex('users')
    .where({ tenant_id: TID })
    .whereIn('role', ['teacher', 'admin'])
    .select('id', 'first_name', 'last_name');
  const userIdByNorm = new Map(users.map((u) => [norm(`${u.first_name} ${u.last_name}`), u.id]));
  for (const s of staffByNorm.values()) s.user_id = userIdByNorm.get(norm(s.name));

  // ── Compute assignments ──
  const rows = [];
  const seen = new Set();
  const classRows = [...classMap.values()];
  for (const s of staffByNorm.values()) {
    if (!s.user_id || (s.role !== 'teacher' && s.role !== 'admin')) continue;
    if (!s.subject && !s.classes) continue;

    const names = subjNames(s.subject);
    const allSubjects = names.includes('__ALL__')
      ? subjectNameList
      : names;
    const isKgSubject = allSubjects.includes('KG (General)');

    let classRowsForGrades = [];
    if (names.includes('__ALL__')) {
      const level = String(s.classes);
      classRowsForGrades = classRows.filter((c) =>
        (c.level_group === 'nursery' && /nursery/i.test(level)) ||
        (c.name.startsWith('LKG') && /lkg|kg/i.test(level)) ||
        (c.name.startsWith('UKG') && /ukg|kg/i.test(level))
      );
    } else if (isKgSubject) {
      const level = String(s.classes);
      classRowsForGrades = classRows.filter((c) =>
        (c.level_group === 'nursery' && /nursery/i.test(level)) ||
        (c.name.startsWith('LKG') && /lkg/i.test(level)) ||
        (c.name.startsWith('UKG') && /ukg/i.test(level)) ||
        (c.level_group === 'kg' && /kg/i.test(level) && !/lkg|ukg/i.test(level))
      );
    } else {
      let grades = parseGrades(s.classes);
      if (!grades.length) {
        const clsMatch = String(s.classes).match(/[1-8]/g);
        grades = clsMatch ? [...new Set(clsMatch.map(Number))].sort() : [];
      }
      classRowsForGrades = classRows.filter((c) =>
        (c.level_group === 'primary' && grades.includes(c.grade_level)) ||
        (c.level_group === 'kg' && /nursery|kg/i.test(String(s.classes)))
      );
    }

    for (const name of allSubjects) {
      if (name === '__ALL__') continue;
      const subjId = subjectIdByName.get(norm(name));
      if (!subjId) continue;
      for (const c of classRowsForGrades) {
        const key = `${s.user_id}|${c.id}|${subjId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          id: uid(`ts-${key}`), tenant_id: TID,
          teacher_id: s.user_id, subject_id: subjId, class_id: c.id, is_primary: false,
        });
      }
    }
  }

  // ── Replace teacher_subjects for this tenant ──
  console.log(`Computed ${rows.length} assignment rows for ${new Set(rows.map((r) => r.teacher_id)).size} teachers.`);
  await knex('teacher_subjects').where({ tenant_id: TID }).del();
  if (rows.length) {
    await knex.batchInsert('teacher_subjects', rows, 200);
  }
  const assigned = await knex('teacher_subjects').where({ tenant_id: TID }).countDistinct('teacher_id as c').first();
  const total = await knex('users').where({ tenant_id: TID }).whereIn('role', ['teacher', 'admin']).count('* as c').first();
  console.log(`teacher_subjects written. ${assigned.c}/${total.c} teacher/admin accounts now have assignments.`);
  await knex.destroy();
}

main().catch(async (err) => {
  console.error(err);
  await knex.destroy();
  process.exit(1);
});