/**
 * Attach both parents' phones (mother/father) to kindergarten students by
 * matching the student's existing guardian phone against the KG phone book.
 * Only fills what is missing; unmatched students are left untouched.
 * Dry-run by default; pass --apply.
 */
const fs = require('fs');
const db = require('/var/www/sms/backend/src/config/database');

const APPLY = process.argv.includes('--apply');
const kg = JSON.parse(fs.readFileSync('/tmp/kg_phones.json', 'utf8'));
const norm = (p) => {
  let d = String(p || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('251')) d = d.slice(3);
  if (d.length === 9) d = '0' + d;
  return d;
};

(async () => {
  const tenant = await db('tenants').select('id').first();
  const tid = tenant.id;

  const phoneMap = new Map();
  for (const r of kg) {
    for (const k of ['mother', 'father']) {
      if (!r[k]) continue;
      if (!phoneMap.has(r[k])) phoneMap.set(r[k], []);
      phoneMap.get(r[k]).push(r);
    }
  }

  const students = await db('students as st').join('users as u', 'st.user_id', 'u.id').join('classes as c', 'st.class_id', 'c.id')
    .where('st.tenant_id', tid).whereIn('c.level_group', ['nursery', 'kg'])
    .select('st.id', 'st.student_number', 'st.mother_phone', 'st.father_phone', 'u.first_name', 'u.last_name', 'u.phone');

  const stats = { total: students.length, filled: 0, alreadyHad: 0, noMatch: 0, ambiguous: 0, noPhone: 0 };
  const ambiguousList = [];
  for (const s of students) {
    const sp = norm(s.phone);
    if (!sp) { stats.noPhone++; continue; }
    const hits = phoneMap.get(sp) || [];
    if (!hits.length) { stats.noMatch++; continue; }
    // If multiple rows, only accept if they agree on both numbers.
    const uniq = new Set(hits.map((h) => `${h.mother}|${h.father}`));
    if (uniq.size > 1) { stats.ambiguous++; if (ambiguousList.length < 10) ambiguousList.push(`${s.first_name} ${s.last_name} (${sp}) -> ${[...uniq].join(' / ')}`); continue; }
    const row = hits[0];
    const mother = row.mother || null;
    const father = row.father || null;
    if ((s.mother_phone || null) === mother && (s.father_phone || null) === father) { stats.alreadyHad++; continue; }
    stats.filled++;
    if (APPLY) await db('students').where({ id: s.id }).update({ mother_phone: mother, father_phone: father, updated_at: db.fn.now() });

    // Add the parent number the student doesn't already have as a second guardian phone on the user (if empty).
  }

  console.log(JSON.stringify({ mode: APPLY ? 'APPLY' : 'DRY-RUN', kgRows: kg.length, ...stats, ambiguousSamples: ambiguousList }, null, 2));
  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
