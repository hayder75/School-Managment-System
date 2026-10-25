#!/usr/bin/env node
/**
 * Backfill student parent-name fields from the student's own name.
 *
 * Ethiopian naming: <given> <father> <grandfather>, stored on the student's
 * user account as first_name / middle_name / last_name. So:
 *   students.father_name       <- users.middle_name (when empty)
 *   students.grandfather_name  <- users.last_name   (when empty)
 * If a part is missing (e.g. no grandfather name), it is left blank so the
 * user can type it in manually.
 *
 * Dry-run by default; pass --apply.
 */
const db = require('../src/config/database');

const APPLY = process.argv.includes('--apply');

async function main() {
  const tenant = await db('tenants').orderBy('created_at').first();
  if (!tenant) { console.error('No tenant found'); process.exit(1); }

  const rows = await db('students as s')
    .join('users as u', 'u.id', 's.user_id')
    .where('s.tenant_id', tenant.id)
    .select(
      's.id',
      's.student_number',
      's.father_name',
      's.grandfather_name',
      'u.first_name',
      'u.middle_name',
      'u.last_name'
    );

  const updates = [];
  let father = 0;
  let grandfather = 0;

  for (const r of rows) {
    const mid = String(r.middle_name || '').trim();
    const last = String(r.last_name || '').trim();
    const f = String(r.father_name || '').trim();
    const g = String(r.grandfather_name || '').trim();
    const patch = {};
    if (!f && mid) { patch.father_name = mid; father++; }
    if (!g && last) { patch.grandfather_name = last; grandfather++; }
    if (Object.keys(patch).length) updates.push({ id: r.id, patch });
  }

  console.log(JSON.stringify({
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    students: rows.length,
    father_name_filled: father,
    grandfather_name_filled: grandfather,
    rows_updated: updates.length,
  }, null, 2));

  if (APPLY && updates.length) {
    const BATCH = 300;
    for (let i = 0; i < updates.length; i += BATCH) {
      const chunk = updates.slice(i, i + BATCH);
      await Promise.all(chunk.map((u) => db('students').where({ id: u.id }).update({ ...u.patch, updated_at: db.fn.now() })));
    }
    console.log('applied', updates.length);
  }

  await db.destroy();
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });