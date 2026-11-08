#!/usr/bin/env node
/**
 * Fill in missing student attendance for past school days as "present".
 *
 * Usage:
 *   node scripts/backfill_attendance_present.js 2026-11-01 2026-11-07
 *
 * Existing rows are never changed. Weekends are skipped. Both the morning and
 * afternoon sessions are filled. The homeroom teacher is recorded as marked_by.
 */
const db = require('../src/database/knexfile');
const knex = require('knex')(db.development);

function iso(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function eachDate(from, to) {
  const out = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) out.push(iso(d));
  return out;
}

(async () => {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const to = process.argv[3] || iso(yesterday);
  const from = process.argv[2] || `${to.slice(0, 7)}-01`;

  const dates = eachDate(from, to).filter((d) => {
    const day = new Date(`${d}T00:00:00Z`).getUTCDay();
    return day !== 0 && day !== 6;
  });

  console.log('Backfilling present attendance');
  console.log('Range:', from, '->', to, '| school days:', dates.length, `(${dates[0]} .. ${dates[dates.length - 1]})`);

  const before = await knex('attendance')
    .whereBetween('date', [from, to])
    .count('* as c')
    .first();
  console.log('Existing rows in range:', Number(before.c));

  const tenants = await knex('tenants').select('id');
  let attempted = 0;

  for (const tenant of tenants) {
    const students = await knex('students')
      .where({ tenant_id: tenant.id, status: 'active' })
      .whereNotNull('class_id')
      .select('user_id', 'class_id');
    if (!students.length) continue;

    const classes = await knex('classes')
      .where({ tenant_id: tenant.id })
      .select('id', 'class_teacher_id');
    const teacherByClass = Object.fromEntries(classes.map((c) => [c.id, c.class_teacher_id]));

    const byClass = new Map();
    for (const s of students) {
      if (!byClass.has(s.class_id)) byClass.set(s.class_id, []);
      byClass.get(s.class_id).push(s.user_id);
    }

    for (const date of dates) {
      for (const [classId, userIds] of byClass) {
        for (const session of ['am', 'pm']) {
          const rows = userIds.map((userId) => ({
            tenant_id: tenant.id,
            student_id: userId,
            class_id: classId,
            date,
            session,
            status: 'present',
            marked_by: teacherByClass[classId] || null,
            remark: 'backfilled present',
          }));
          attempted += rows.length;
          // Chunk to keep statements reasonable.
          for (let i = 0; i < rows.length; i += 400) {
            await knex('attendance')
              .insert(rows.slice(i, i + 400))
              .onConflict(['student_id', 'class_id', 'date', 'session'])
              .ignore();
          }
        }
      }
    }
  }

  const after = await knex('attendance')
    .whereBetween('date', [from, to])
    .count('* as c')
    .first();
  console.log('Attempted rows (including existing):', attempted);
  console.log('Rows now in range:', Number(after.c), '| inserted:', Number(after.c) - Number(before.c));
  await knex.destroy();
})().catch(async (err) => {
  console.error('ERR', err.message);
  try { await knex.destroy(); } catch {}
  process.exit(1);
});
