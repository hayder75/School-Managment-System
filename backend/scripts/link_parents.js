#!/usr/bin/env node
/**
 * Rebuild parent <-> student links from the master student list.
 * Input: TSV of "STUDENT_NUMBER<TAB>GUARDIAN_PHONE".
 * Matches student by student_number and parent by normalized phone.
 * Dry-run by default; pass --apply.
 */
const fs = require('fs');
const db = require('../src/config/database');

const FILE = process.argv.find((a) => a.includes('.tsv'));
const APPLY = process.argv.includes('--apply');

const norm = (p) => {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('251')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
};

async function main() {
  const tenant = await db('tenants').select('id').first();
  const tid = tenant.id;
  const rows = fs.readFileSync(FILE, 'utf8').trim().split('\n')
    .map((l) => l.split('\t'))
    .filter(([r, g]) => r && g);

  // Load parents keyed by normalized phone.
  const parents = await db('users')
    .where({ tenant_id: tid, role: 'parent', status: 'active' })
    .select('id', 'phone');
  const parentByPhone = new Map();
  for (const p of parents) {
    const k = norm(p.phone);
    if (k) parentByPhone.set(k, p.id);
  }

  // Load students by student_number.
  const students = await db('students')
    .where({ tenant_id: tid })
    .select('id', 'student_number');
  const studentByNumber = new Map();
  for (const s of students) {
    if (s.student_number) studentByNumber.set(String(s.student_number).trim().toUpperCase(), s.id);
  }

  // Existing links to avoid duplicates.
  const existing = await db('student_parents').where({ tenant_id: tid }).select('student_id', 'parent_id');
  const seen = new Set(existing.map((x) => `${x.student_id}|${x.parent_id}`));

  let linked = 0, noStudent = 0, noParent = 0, dup = 0;
  const toInsert = [];
  for (const [reg, gp] of rows) {
    const sid = studentByNumber.get(reg.trim().toUpperCase());
    if (!sid) { noStudent++; continue; }
    const pid = parentByPhone.get(norm(gp));
    if (!pid) { noParent++; continue; }
    if (seen.has(`${sid}|${pid}`) || toInsert.some((x) => x.student_id === sid && x.parent_id === pid)) { dup++; continue; }
    toInsert.push({ tenant_id: tid, student_id: sid, parent_id: pid, relationship: 'guardian', is_primary: true });
    linked++;
  }

  console.log(JSON.stringify({ mode: APPLY ? 'APPLY' : 'DRY-RUN', inputRows: rows.length, linked, noStudent, noParent, dup, existingLinks: existing.length }, null, 2));

  if (APPLY && toInsert.length) {
    const BATCH = 500;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      await db('student_parents').insert(toInsert.slice(i, i + BATCH));
    }
    console.log('inserted', toInsert.length);
  }
  await db.destroy();
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });