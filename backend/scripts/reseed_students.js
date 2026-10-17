#!/usr/bin/env node
/**
 * Clear existing students and re-seed from the updated students Excel.
 * Usage: node scripts/reseed_students.js /path/to/file.xlsx [--apply]
 * Dry-run prints the plan; --apply performs the clear + seed.
 */
const fs = require('fs');
const ExcelJS = require('exceljs');
const bcrypt = require('bcrypt');
const db = require('../src/config/database');

const FILE = process.argv.find((a) => a.endsWith('.xlsx'));
const APPLY = process.argv.includes('--apply');
const TODAY = new Date().toISOString().slice(0, 10);

const norm = (s) => String(s || '').toLowerCase().trim();
const isXxxx = (s) => /^x+$/i.test(String(s || '').trim());

async function tableExists(name) {
  const r = await db('information_schema.tables').where({ table_schema: 'public', table_name: name }).first();
  return !!r;
}

const STUDENT_CHILD_REC = [
  'book_borrowings', 'enrollments', 'report_card_meta', 'student_achievements',
  'student_discipline', 'student_documents', 'student_fee_subscriptions', 'student_gate_passes',
  'student_graduations', 'student_medical', 'student_monthly_bills', 'student_parents',
  'student_promotions', 'student_status_history', 'student_transfers', 'hostel_allocations',
  'transport_allocations',
];

async function main() {
  if (!FILE) { console.error('pass an .xlsx file'); process.exit(1); }
  const tenant = await db('tenants').select('id', 'name').first();
  const tenantId = tenant.id;

  // read excel
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];
  const rows = [];
  for (let i = 2; i <= ws.rowCount; i++) {
    const v = ws.getRow(i).values.slice(1);
    const num = String(v[1] || '').trim();
    const first = String(v[2] || '').trim();
    const middle = String(v[3] || '').trim();
    let last = String(v[4] || '').trim();
    if (isXxxx(last)) last = ''; // placeholder -> blank
    const gender = String(v[5] || '').trim().toUpperCase() === 'M' ? 'male' : String(v[5] || '').trim().toUpperCase() === 'F' ? 'female' : '';
    const code = String(v[6] || '').trim();
    if (!first && !num) continue;
    rows.push({ num, first, middle, last, gender, code });
  }

  // classes
  const classes = await db('classes').where({ tenant_id: tenantId }).select('id', 'name');
  const classByLower = new Map(classes.map((c) => [norm(c.name), c.id]));

  // plan (dry-run)
  const stats = { total: rows.length, archived: 0, unassigned: 0, matchedClass: 0, noClass: 0 };
  const plan = rows.map((r) => {
    const isArch = norm(r.code) === '__archive__';
    if (isArch) { stats.archived++; return { ...r, status: 'archived', class_id: null }; }
    if (!r.code) { stats.noClass++; return { ...r, status: 'active', class_id: null }; }
    const id = classByLower.get(norm(r.code));
    if (!id) { stats.noClass++; return { ...r, status: 'active', class_id: null }; }
    stats.matchedClass++;
    return { ...r, status: 'active', class_id: id };
  });
  const dupNum = new Map();
  plan.forEach((p) => dupNum.set(p.num, (dupNum.get(p.num) || 0) + 1));
  const dupNums = [...dupNum.entries()].filter(([, c]) => c > 1).map(([n]) => n);
  console.log(JSON.stringify({ mode: APPLY ? 'APPLY' : 'DRY-RUN', ...stats, duplicateStudentNumbers: dupNums.length, firstDup: dupNums.slice(0, 5) }, null, 2));

  if (!APPLY) { await db.destroy(); return; }

  // ── CLEAR existing students ──
  console.log('clearing existing students…');
  const studentUsers = await db('users').where({ tenant_id: tenantId, role: 'student' }).select('id');
  const studentRecs = await db('students').where({ tenant_id: tenantId }).select('id', 'user_id');
  const uids = [...studentUsers.map((u) => u.id), ...studentRecs.map((s) => s.user_id)];
  const rids = studentRecs.map((s) => s.id);
  const uniqueUids = [...new Set(uids)];
  const uniqueRids = [...new Set(rids)];

  // children keyed by users.id
  for (const t of ['attendance', 'grades', 'payments']) {
    if (uniqueUids.length && (await tableExists(t))) await db(t).whereIn('student_id', uniqueUids).del();
  }
  for (const t of ['chat_participants', 'notifications', 'user_permissions', 'user_roles', 'password_reset_tokens', 'submission_comments']) {
    if (uniqueUids.length && (await tableExists(t))) await db(t).whereIn('user_id', uniqueUids).del();
  }
  // children keyed by students.id
  for (const t of STUDENT_CHILD_REC) {
    if (uniqueRids.length && (await tableExists(t))) await db(t).whereIn('student_id', uniqueRids).del();
  }
  if (uniqueRids.length) await db('students').whereIn('id', uniqueRids).del();
  if (uniqueUids.length) await db('users').whereIn('id', uniqueUids).del();

  // ── SEED new students ──
  console.log('seeding students…');
  const pwd = bcrypt.hashSync('1234', 10);
  let created = 0, missingNum = 0, seq = 1;
  await db.transaction(async (trx) => {
    for (const p of plan) {
      let username = p.num || `stu${String(seq++).padStart(4, '0')}`;
      if (!p.num) missingNum++;
      const taken = await trx('users').where({ username }).first();
      if (taken) username = `${username}s${seq++}`;
      const email = `${username}@students.mountolive.edu.et`;
      const [u] = await trx('users').insert({
        tenant_id: tenantId,
        email,
        username,
        first_name: p.first,
        middle_name: p.middle || '',
        last_name: p.last || '',
        gender: p.gender || null,
        role: 'student',
        status: 'active',
        password_hash: pwd,
      }).returning('id');
      await trx('students').insert({
        tenant_id: tenantId,
        user_id: u.id,
        class_id: p.class_id || null,
        student_number: p.num || null,
        status: p.status,
        enrollment_date: TODAY,
      });
      created++;
      if (created % 500 === 0) console.log(`  ${created}…`);
    }
  });

  const cnt = await db('students').where({ tenant_id: tenantId }).count('* as c').first();
  const use = await db('users').where({ tenant_id: tenantId, role: 'student' }).count('* as c').first();
  console.log(`done. students=${cnt.c} student_users=${use.c} missing_num=${missingNum}`);
  await db.destroy();
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });