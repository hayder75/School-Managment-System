#!/usr/bin/env node
/**
 * Seed teacher load (teacher_subjects) and the timetable (timetable_entries).
 * Dry-run by default; pass --apply. Usage: node scripts/seed_load_timetable.js <seedDir> [--apply]
 */
const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

const args = process.argv.slice(2);
const SEED_DIR = args.find((a) => !a.startsWith('--')) || '/tmp/seed';
const APPLY = args.includes('--apply');
const read = (f) => JSON.parse(fs.readFileSync(path.join(SEED_DIR, f), 'utf8'));

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const nameNorm = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();

const PERIOD_TIMES = {
  1: ['08:00', '08:45'], 2: ['08:45', '09:30'], 3: ['09:50', '10:35'],
  4: ['10:35', '11:20'], 5: ['13:00', '13:45'], 6: ['13:45', '14:30'], 7: ['14:30', '15:15'],
};

const SUBJECT_ALIAS = {
  safoo: 'sidamuafo', 'safoo': 'sidamuafo',
  spokenenglish: 'spoken', english: 'english',
  hpe: 'hpe', maths: 'maths', science: 'science', pva: 'pva', moral: 'moral',
  socialstudy: 'socialstudy', ict: 'ict', cte: 'cte', amharic: 'amharic',
};

function expandSections(raw) {
  const out = [];
  const re = /(\d+)([A-G])(?:-(\d+)?([A-G]))?/g;
  let m;
  while ((m = re.exec(String(raw)))) {
    const g = Number(m[1]);
    const start = m[2];
    const end = m[4] || m[2];
    for (let c = start.charCodeAt(0); c <= end.charCodeAt(0); c++) {
      out.push({ grade: g, section: String.fromCharCode(c) });
    }
  }
  return out;
}

(async () => {
  const tenant = await db('tenants').select('id').first();
  const tenantId = tenant.id;
  const load = read('teacher_load.json');
  const tt = read('timetable.json');

  // subject map
  const subjectRows = await db('subjects').where({ tenant_id: tenantId }).select('id', 'name');
  const subjByNorm = {};
  for (const s of subjectRows) subjByNorm[norm(s.name)] = s.id;
  const ensureSubject = async (name) => {
    const key = SUBJECT_ALIAS[norm(name)] || norm(name);
    if (subjByNorm[key]) return subjByNorm[key];
    // try contains
    const found = Object.keys(subjByNorm).find((k) => k.includes(key) || key.includes(k));
    if (found) return subjByNorm[found];
    if (!APPLY) return 'NEW';
    const [row] = await db('subjects').insert({ tenant_id: tenantId, name }).returning('id');
    subjByNorm[norm(name)] = row.id;
    return row.id;
  };

  // teacher map
  const staff = await db('users').where({ tenant_id: tenantId }).whereIn('role', ['teacher', 'principal', 'vice_principal', 'quality_director']).select('id', 'first_name', 'last_name');
  const staffByFull = {}; const staffByFirst = {};
  for (const u of staff) { staffByFull[nameNorm(`${u.first_name} ${u.last_name}`)] = u.id; staffByFirst[nameNorm(u.first_name)] = staffByFirst[nameNorm(u.first_name)] || u.id; }

  const TEACHER_ALIAS = { mekdes: 'mekides', mekedes: 'mekides' };
  const findTeacher = async (name) => {
    let first = nameNorm(String(name).split(' ')[0]);
    const rest = nameNorm(String(name).split(' ').slice(1).join(' '));
    if (TEACHER_ALIAS[first]) first = TEACHER_ALIAS[first];
    // exact first name
    let id = staffByFirst[first];
    if (id) return id;
    // prefix match (either direction)
    const cand = Object.keys(staffByFirst).filter((k) => k.startsWith(first) || first.startsWith(k));
    if (cand.length === 1) return staffByFirst[cand[0]];
    // first name + last initial
    const withLast = Object.keys(staffByFull).find((k) => k.split(' ')[0].startsWith(first) && k.split(' ')[1] && rest && k.split(' ')[1][0] === rest[0]);
    if (withLast) return staffByFull[withLast];
    if (cand.length > 1) return staffByFirst[cand[0]];
    // create a teacher account for genuinely-absent people
    if (APPLY) {
      const parts = String(name).split(' ');
      const fname = parts[0] || name; const lname = parts.slice(1).join(' ');
      const uname = `${fname}.${lname || 'staff'}`.toLowerCase().replace(/[^a-z0-9.]/g, '') + '.t';
      const [u] = await db('users').insert({
        tenant_id: tenantId, first_name: fname, last_name: lname, role: 'teacher', status: 'active',
        username: uname, email: `${uname}@staff.mountolive.edu.et`, password_hash: require('bcrypt').hashSync('1234', 10),
      }).returning('*');
      staffByFirst[first] = u.id;
      return u.id;
    }
    return null;
  };

  // class map
  const classes = await db('classes').where({ tenant_id: tenantId }).select('id', 'grade_level', 'section');
  const classKey = {};
  for (const c of classes) classKey[`${c.grade_level}|${c.section}`] = c.id;
  const classFor = (g, s) => classKey[`${g}|${s}`] || null;

  const plan = { teacherSubjects: 0, timetable: 0, missingTeacher: new Set(), missingClass: 0, newSubjects: 0 };

  // code -> {teacher_id, subject_id}
  const codeMap = {};
  for (const row of load) {
    const teacherId = await findTeacher(row.teacher);
    const subjectId = await ensureSubject(row.subject === 'S.Afoo' ? 'Sidamu Afo' : row.subject);
    if (subjectId === 'NEW') plan.newSubjects++;
    if (!teacherId) plan.missingTeacher.add(row.teacher);
    codeMap[row.code] = { teacherId, subjectId };
    for (const { grade, section } of expandSections(row.sections_raw)) {
      const classId = classFor(grade, section);
      if (!classId) { plan.missingClass++; continue; }
      plan.teacherSubjects++;
      if (APPLY && teacherId && subjectId && subjectId !== 'NEW') {
        const exists = await db('teacher_subjects').where({ tenant_id: tenantId, teacher_id: teacherId, subject_id: subjectId, class_id: classId }).first();
        if (!exists) await db('teacher_subjects').insert({ tenant_id: tenantId, teacher_id: teacherId, subject_id: subjectId, class_id: classId });
      }
    }
  }

  // timetable entries
  for (const e of tt) {
    const classId = classFor(e.grade, e.section);
    const code = codeMap[e.code];
    if (!classId || !code) { plan.missingClass++; continue; }
    plan.timetable++;
    if (APPLY && code.teacherId && code.subjectId && code.subjectId !== 'NEW') {
      const times = PERIOD_TIMES[e.period] || ['08:00', '08:45'];
      const exists = await db('timetable_entries').where({ tenant_id: tenantId, class_id: classId, day_of_week: e.day, start_time: times[0] }).first();
      if (!exists) await db('timetable_entries').insert({ tenant_id: tenantId, class_id: classId, subject_id: code.subjectId, teacher_id: code.teacherId, day_of_week: e.day, start_time: times[0], end_time: times[1] });
    }
  }

  // homeroom assignment
  let homeroom = [];
  try { homeroom = read('homeroom.json'); } catch { homeroom = []; }
  let homeroomSet = 0;
  const shortClass = (code) => {
    const u = String(code || '').toUpperCase().replace('NURSURY', 'NURSERY');
    let m = u.match(/^(?:GRADE\s*)?(\d+)\s*([A-F])$/);
    if (m) return { grade: Number(m[1]), section: m[2] };
    m = u.match(/^LKG\s*([A-F])$/); if (m) return { grade: 1, section: m[1], kg: true };
    m = u.match(/^UKG\s*([A-F])$/); if (m) return { grade: 2, section: m[1], kg: true };
    m = u.match(/^NURSERY\s*([A-F])$/); if (m) return { grade: 0, section: m[1], nursery: true };
    return null;
  };
  for (const h of homeroom) {
    if (h.teacher.toLowerCase() === 'unassigned') continue;
    const sc = shortClass(h.class_code);
    if (!sc) continue;
    const cls = await db('classes').where({ tenant_id: tenantId, grade_level: sc.grade, section: sc.section }).first();
    if (!cls) continue;
    const teacherId = await findTeacher(h.teacher);
    if (!teacherId) continue;
    homeroomSet++;
    if (APPLY) await db('classes').where({ id: cls.id }).update({ class_teacher_id: teacherId, updated_at: db.fn.now() });
  }
  plan.homeroomSet = homeroomSet;

  console.log(JSON.stringify({ mode: APPLY ? 'APPLY' : 'DRY-RUN', plan: { ...plan, missingTeacher: [...plan.missingTeacher] } }, null, 2));
  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
