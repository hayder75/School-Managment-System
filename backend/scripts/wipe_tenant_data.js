#!/usr/bin/env node
/**
 * Wipe demo data for the tenant before reseeding the real data.
 * Dry-run by default; pass --apply to delete. Keeps owner/super_admin accounts.
 * Usage: node scripts/wipe_tenant_data.js [--apply]
 */
const db = require('../src/config/database');
const APPLY = process.argv.includes('--apply');

const TABLES = [
  'chat_reports', 'chat_restrictions', 'chat_messages', 'chat_participants', 'chat_conversations',
  'student_monthly_bills', 'student_fee_subscriptions', 'fee_structure_amounts', 'fee_structures',
  'payments', 'student_status_history', 'student_graduations', 'student_transfers', 'student_promotions',
  'student_parents', 'enrollments', 'students',
  'teacher_subjects', 'timetable_entries', 'staff_attendance', 'payroll',
  'subject_levels', 'subjects', 'classes',
];

(async () => {
  const tenant = await db('tenants').select('id').first();
  const tenantId = tenant.id;

  const counts = {};
  for (const t of TABLES) {
    try {
      const [{ c }] = await db(t).where({ tenant_id: tenantId }).count('* as c');
      counts[t] = Number(c);
    } catch { counts[t] = 'n/a'; }
  }
  const [{ c: demoUsers }] = await db('users').where({ tenant_id: tenantId }).whereNotIn('role', ['owner', 'super_admin']).count('* as c');
  counts['users (non-owner)'] = Number(demoUsers);

  console.log(JSON.stringify({ mode: APPLY ? 'APPLY' : 'DRY-RUN', counts }, null, 2));

  if (!APPLY) { console.log('dry-run only (pass --apply to delete)'); await db.destroy(); return; }

  await db.transaction(async (trx) => {
    for (const t of TABLES) {
      try { await trx(t).where({ tenant_id: tenantId }).del(); } catch { /* table absent */ }
    }
    await trx('users').where({ tenant_id: tenantId }).whereNotIn('role', ['owner', 'super_admin']).del();
  });
  console.log('wipe complete');
  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
