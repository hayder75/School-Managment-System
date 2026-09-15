#!/usr/bin/env node
/**
 * Seed the school's real data. Dry-run by default; pass --apply to write.
 * Usage: node scripts/seed_real_data.js <seedDir> [--apply]
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('../src/config/database');

const args = process.argv.slice(2);
const SEED_DIR = args.find((a) => !a.startsWith('--')) || '/tmp/seed';
const APPLY = args.includes('--apply');
const PASSWORD_HASH = bcrypt.hashSync('1234', 10);

const read = (f, d = []) => {
  const p = path.join(SEED_DIR, f);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d;
};

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();

function roleFor(jobTitle) {
  const j = String(jobTitle || '').toLowerCase();
  if (j.includes('g.m') || j.includes('general manager')) return 'general_manager';
  if (j.includes('director')) return 'admin';
  if (j.includes('vice principal')) return 'vice_principal';
  if (j.includes('principal')) return 'principal';
  if (j.includes('hr') || j.includes('human')) return 'hr';
  if (j.includes('account') || j.includes('finance')) return 'accountant';
  if (j.includes('cashier')) return 'cashier';
  if (j.includes('librar')) return 'support';
  if (j.includes('guard') || j.includes('janit') || j.includes('clean') || j.includes('support') || j.includes('driver') || j.includes('nurse')) return 'support';
  if (j.includes('legal') || j.includes('secretary') || j.includes('admin')) return 'admin';
  return 'teacher';
}

async function uniqueUsername(trx, tenantId, base, excludeId) {
  let candidate = String(base || 'user').toLowerCase().replace(/[^a-z0-9.]/g, '') || 'user';
  let n = 1;
  while (true) {
    const row = await trx('users').where({ tenant_id: tenantId, username: candidate }).first();
    if (!row || row.id === excludeId) return candidate;
    candidate = `${base}${n++}`;
    if (n > 80) return `${base}${Date.now().toString(36).slice(-4)}`;
  }
}

async function classMetaMap(trx, tenantId, students, homeroom) {
  const metas = new Map();
  for (const s of students) if (s.class) metas.set(`${s.class.level_group}|${s.class.grade_level}|${s.class.section}`, s.class);
  const map = {};
  for (const [key, m] of metas) {
    let cls = await trx('classes').where({ tenant_id: tenantId, name: m.name }).first();
    if (!cls) cls = await trx('classes').where({ tenant_id: tenantId, level_group: m.level_group, grade_level: m.grade_level }).andWhere({ section: m.section }).first();
    if (!cls) {
      if (APPLY) {
        [cls] = await trx('classes').insert({ tenant_id: tenantId, name: m.name, level_group: m.level_group, grade_level: m.grade_level, section: m.section }).returning('*');
      } else {
        cls = { id: `NEW:${m.name}` };
      }
    }
    map[key] = cls.id;
    map[m.name] = cls.id;
  }
  return map;
}

// Parse a short class code ("1B", "LKG A", "GRADE 8E", "NURSURY A") -> class meta.
function classMeta(code) {
  const u = String(code || '').trim().toUpperCase().replace('NURSURY', 'NURSERY');
  let mm = u.match(/^NURSERY\s*([A-F])$/);
  if (mm) return { name: `Nursery ${mm[1]}`, level_group: 'nursery', grade_level: 0, section: mm[1] };
  mm = u.match(/^LKG\s*([A-F])$/);
  if (mm) return { name: `LKG ${mm[1]}`, level_group: 'kg', grade_level: 1, section: mm[1] };
  mm = u.match(/^UKG\s*([A-F])$/);
  if (mm) return { name: `UKG ${mm[1]}`, level_group: 'kg', grade_level: 2, section: mm[1] };
  mm = u.match(/^(?:GRADE\s*)?(\d+)\s*([A-F])$/);
  if (mm) { const g = Number(mm[1]); return { name: `Grade ${g} ${mm[2]}`, level_group: 'primary', grade_level: g, section: mm[2] }; }
  return null;
}

(async () => {
  const tenant = await db('tenants').select('id').first();
  const tenantId = tenant.id;
  const students = read('students_master.json');
  const extras = read('students_extra.json');
  const staff = read('staff.json');
  const subjects = read('subjects.json');
  const homeroom = read('homeroom.json');

  const plan = { classes: 0, subjects: 0, staff: 0, students: 0, parents: 0, links: 0, homeroom: 0, archived: 0 };
  let classMap = {};

  await db.transaction(async (trx) => {
    // classes
    const allForClasses = [...students.filter((s) => s.class), ...extras.filter((s) => s.class)];
    classMap = await classMetaMap(trx, tenantId, allForClasses, homeroom);
    plan.classes = Object.values(classMap).filter((v) => typeof v === 'string' && v.startsWith('NEW:')).length;

    // subjects
    for (const s of subjects) {
      const existing = await trx('subjects').where({ tenant_id: tenantId, name: s.name }).first();
      if (!existing) { plan.subjects++; if (APPLY) await trx('subjects').insert({ tenant_id: tenantId, name: s.name }); }
    }

    // staff
    const staffByName = {};
    for (const st of staff) {
      const parts = st.name.split(' ');
      const first = parts[0] || st.name;
      const last = parts.slice(1).join(' ');
      let user = st.phone ? await trx('users').where({ tenant_id: tenantId, phone: st.phone }).first() : null;
      if (!user) user = await trx('users').where({ tenant_id: tenantId }).whereRaw('lower(first_name)=? and lower(last_name)=?', [first.toLowerCase(), last.toLowerCase()]).first();
      if (!user) {
        plan.staff++;
        if (APPLY) {
          const username = await uniqueUsername(trx, tenantId, `${first}.${last}`.toLowerCase());
          [user] = await trx('users').insert({
            tenant_id: tenantId, first_name: first, last_name: last, role: roleFor(st.job_title),
            status: 'active', phone: st.phone || null, job_title: st.job_title || null,
            qualification: st.qualification || null, field_of_study: st.field || null,
            gender: st.gender || null, username, password_hash: PASSWORD_HASH,
          }).returning('*');
        } else {
          user = { id: `NEW:${st.name}` };
        }
      }
      staffByName[norm(st.name)] = user.id;
    }

    // homeroom
    for (const h of homeroom) {
      if (h.teacher.toLowerCase() === 'unassigned') continue;
      const cm = classMeta(h.class_code);
      const classId = cm ? classMap[cm.name] : null;
      let teacherId = staffByName[norm(h.teacher)] || null;
      if (!teacherId) {
        const key = norm(h.teacher);
        const match = Object.keys(staffByName).find((k) => k.split(' ')[0] === key.split(' ')[0]);
        if (match) teacherId = staffByName[match];
      }
      if (teacherId && classId) { plan.homeroom++; if (APPLY) await trx('classes').where({ id: classId }).update({ class_teacher_id: teacherId }); }
    }

    // students + parents + links
    const allStudents = [...students.map((s) => ({ ...s, archived: s.archived })), ...extras.map((e) => ({ ...e, archived: false }))];
    const dryPhones = new Set();
    let dryLinks = 0;
    for (const s of allStudents) {
      const classKey = s.class ? `${s.class.level_group}|${s.class.grade_level}|${s.class.section}` : null;
      const classId = classKey ? classMap[classKey] : null;
      plan.students++; if (s.archived) plan.archived++;
      if (!APPLY) {
        for (const p of [s.phone, s.mother_phone, s.father_phone].filter(Boolean)) { dryPhones.add(p); dryLinks += 1; }
        continue;
      }
      const username = s.reg || await uniqueUsername(trx, tenantId, `${s.first}.${s.middle}`);
      const email = `${(s.reg || `${s.first}.${Date.now().toString(36)}`).toLowerCase()}@students.mountolive.edu.et`;
      const [u] = await trx('users').insert({
        tenant_id: tenantId, first_name: s.first, last_name: s.middle || '', email, username,
        role: 'student', status: 'active', password_hash: PASSWORD_HASH, gender: s.gender || null,
      }).returning('*');
      const [st] = await trx('students').insert({
        tenant_id: tenantId, user_id: u.id, student_number: s.reg || null, class_id: classId,
        status: s.archived ? 'archived' : 'active', gender: s.gender || null,
        father_name: s.middle || null, grandfather_name: s.last || null,
      }).returning('*');
      const phones = [s.phone, s.mother_phone, s.father_phone].filter(Boolean);
      const rel = [s.phone ? 'guardian' : null, s.mother_phone ? 'mother' : null, s.father_phone ? 'father' : null].filter(Boolean);
      let primary = true;
      for (let i = 0; i < phones.length; i++) {
        const ph = phones[i];
        let parent = await trx('users').where({ tenant_id: tenantId, role: 'parent', username: ph }).first();
        if (!parent) { plan.parents++; parent = await trx('users').insert({ tenant_id: tenantId, first_name: '', last_name: '', role: 'parent', status: 'active', phone: ph, username: ph, password_hash: PASSWORD_HASH }).returning('*').then((r) => r[0]); }
        const exists = await trx('student_parents').where({ student_id: st.id, parent_id: parent.id }).first();
        if (!exists) { plan.links++; await trx('student_parents').insert({ tenant_id: tenantId, student_id: st.id, parent_id: parent.id, relationship: rel[i] || 'guardian', is_primary: primary }); primary = false; }
      }
    }

    if (!APPLY) { plan.parents = dryPhones.size; plan.links = dryLinks; }
  });

  console.log(JSON.stringify({ mode: APPLY ? 'APPLY' : 'DRY-RUN', plan }, null, 2));
  const total = students.length + extras.length;
  console.log(`students total: ${total} (master ${students.length} + extras ${extras.length})`);
  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
