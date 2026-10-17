/**
 * Reconcile students to the clean roster file (authoritative).
 * - matches by student registration number
 * - sets first/middle/last (blank last when "Xxxx"), gender, guardian phone, class
 * - archives students marked __ARCHIVE__, keeps others active
 * - creates file students missing from the DB
 * - deletes DB students NOT in the file (seed duplicates) when they have no data
 * Dry-run by default; pass --apply.
 */
const fs = require('fs');
const bcrypt = require('bcrypt');
const db = require('/var/www/sms/backend/src/config/database');

const APPLY = process.argv.includes('--apply');
const file = JSON.parse(fs.readFileSync('/tmp/clean_students.json', 'utf8'));
const upper = (s) => String(s || '').trim().toUpperCase();
const norm = (s) => String(s || '').trim();

function classMeta(code) {
  const u = upper(code).replace(/NURSURY/g, 'NURSERY');
  let m;
  if ((m = u.match(/^GRADE\s*(\d+)\s*([A-G])$/))) return { name: `Grade ${m[1]} ${m[2]}` };
  if ((m = u.match(/^NURSERY\s*([A-G])$/))) return { name: `Nursery ${m[1]}` };
  if ((m = u.match(/^LKG\s*([A-G])$/))) return { name: `LKG ${m[1]}` };
  if ((m = u.match(/^UKG\s*([A-G])$/))) return { name: `UKG ${m[1]}` };
  return null;
}
function phoneNorm(p) {
  const d = String(p || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('251') && d.length === 12) return '0' + d.slice(3);
  if (d.length === 9) return '0' + d;
  return d;
}
const mapGender = (g) => (String(g).toUpperCase() === 'M' ? 'male' : String(g).toUpperCase() === 'F' ? 'female' : null);

(async () => {
  const tenant = await db('tenants').select('id').first();
  const tid = tenant.id;
  const classes = await db('classes').where({ tenant_id: tid }).select('id', 'name');
  const classMap = {};
  for (const c of classes) classMap[c.name.toLowerCase()] = c.id;
  // generic fallback: match by grade/section if name mismatch
  const classByGS = {};
  for (const c of classes) classByGS[c.name.toLowerCase().replace(/\s+/g, '')] = c.id;

  const students = await db('students as st').join('users as u', 'st.user_id', 'u.id')
    .where('st.tenant_id', tid).select('st.id', 'st.user_id', 'st.student_number', 'u.first_name', 'u.last_name', 'u.gender', 'u.phone', 'st.status');
  const byReg = new Map();
  for (const s of students) if (s.student_number) byReg.set(upper(s.student_number), s);

  const fileRegs = new Set(file.map((r) => upper(r.reg)));
  const stats = { updated: 0, archived: 0, created: 0, deleted: 0, skippedDelete: 0, classSet: 0, unmappedClass: 0 };
  const skipped = [];

  for (const r of file) {
    const isArchive = upper(r.code) === '__ARCHIVE__';
    const cm = isArchive ? null : classMeta(r.code);
    if (!isArchive && !cm) { stats.unmappedClass++; continue; }
    const classId = cm ? (classMap[cm.name.toLowerCase()] || classByGS[cm.name.toLowerCase().replace(/\s+/g, '')] || null) : null;
    const first = norm(r.first);
    const middle = norm(r.middle);
    const last = /^x+$/i.test(norm(r.last)) ? '' : norm(r.last);
    const gender = mapGender(r.gender);
    const phone = phoneNorm(r.phone);
    const s = byReg.get(upper(r.reg));

    if (s) {
      stats.updated++;
      if (isArchive) stats.archived++;
      if (classId) stats.classSet++;
      if (APPLY) {
        await db('users').where({ id: s.user_id }).update({ first_name: first, middle_name: middle || null, last_name: last || '', gender, phone, updated_at: db.fn.now() });
        const patch = { status: isArchive ? 'archived' : 'active', updated_at: db.fn.now() };
        if (!isArchive && classId) patch.class_id = classId;
        await db('students').where({ id: s.id }).update(patch);
      }
    } else {
      stats.created++;
      if (APPLY) {
        let uname = upper(r.reg).toLowerCase().replace(/[^a-z0-9]/g, '') || `stu${Date.now().toString(36)}`;
        const clash = await db('users').where({ tenant_id: tid, username: uname }).first();
        if (clash) uname = `${uname}.${Math.random().toString(36).slice(2, 6)}`;
        const [u] = await db('users').insert({
          tenant_id: tid, first_name: first, middle_name: middle || null, last_name: last || '',
          role: 'student', status: 'active', gender, phone,
          email: `${uname}@students.mountolive.edu.et`, username: uname,
          password_hash: bcrypt.hashSync('1234', 10),
        }).returning('id');
        await db('students').insert({ tenant_id: tid, user_id: u.id, student_number: r.reg, class_id: classId, status: isArchive ? 'archived' : 'active' });
      }
    }
  }

  // Delete DB students not present in the file (seed duplicates), only if no real data
  const extras = students.filter((s) => !fileRegs.has(upper(s.student_number)));
  for (const s of extras) {
    const cAtt = Number((await db('attendance').where({ student_id: s.id }).count('* as c').first().catch(() => ({ c: 0 }))).c);
    const cGrd = Number((await db('grades').where({ student_id: s.id }).count('* as c').first().catch(() => ({ c: 0 }))).c);
    const cBill = Number((await db('student_monthly_bills').where({ student_id: s.id }).count('* as c').first().catch(() => ({ c: 0 }))).c);
    const cPay = Number((await db('payments').where({ student_id: s.user_id }).count('* as c').first().catch(() => ({ c: 0 }))).c);
    const protectedCount = cAtt + cGrd + cBill + cPay;
    if (protectedCount > 0) {
      stats.skippedDelete++;
      if (skipped.length < 10) skipped.push(`${s.first_name} ${s.last_name}: att=${cAtt} grd=${cGrd} bill=${cBill} pay=${cPay}`);
      continue;
    }
    stats.deleted++;
    if (APPLY) await db('users').where({ id: s.user_id }).del();
  }

  console.log(JSON.stringify({ mode: APPLY ? 'APPLY' : 'DRY-RUN', fileRows: file.length, dbBefore: students.length, ...stats, finalExpected: file.length, skipped }, null, 2));
  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
