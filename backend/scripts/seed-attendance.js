/* eslint-disable no-console */
/**
 * Mount Olive School — generate realistic 2026 attendance records.
 *
 * Wipes existing attendance for the tenant and generates weekday records for
 * every enrolled student from 2026-01-01 to 2026-08-31. Statuses are
 * deterministic (hash of student+date) and a small set of "chronic absentees"
 * is baked in so admin absence analytics has a meaningful leaderboard.
 *
 * Usage: node scripts/seed-attendance.js
 */
const crypto = require('crypto');
const knex = require('knex')(require('../src/database/knexfile').development);

const TID = '00000000-0000-0000-0000-000000000001';

function hash(seed) {
  return parseInt(crypto.createHash('md5').update(String(seed)).digest('hex').slice(0, 8), 16);
}

function isWeekday(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  return day >= 1 && day <= 5;
}

function statusFor(studentId, dateStr, chronic) {
  const r = hash(`${studentId}-${dateStr}`) % 100;
  if (chronic) {
    if (r < 38) return 'absent';
    if (r < 55) return 'late';
    if (r < 93) return 'present';
    return 'excused';
  }
  if (r < 85) return 'present';
  if (r < 91) return 'late';
  if (r < 96) return 'absent';
  return 'excused';
}

async function main() {
  const students = await knex('students')
    .where({ tenant_id: TID })
    .select('id', 'user_id', 'class_id');

  const chronic = new Set(
    students.filter((s) => hash(s.user_id) % 73 === 0).map((s) => s.user_id)
  );
  console.log(`Students: ${students.length}, chronic absentees: ${chronic.size}`);

  await knex('attendance').where({ tenant_id: TID }).del();
  console.log('Cleared existing attendance');

  const marker = await knex('users').where({ tenant_id: TID, role: 'admin' }).first();

  const start = Date.UTC(2026, 0, 1);
  const end = Date.UTC(2026, 7, 31);

  let inserted = 0;
  let batch = [];
  for (let t = start; t <= end; t += 24 * 60 * 60 * 1000) {
    const date = new Date(t);
    if (!isWeekday(date)) continue;
    const dateStr = date.toISOString().slice(0, 10);
    for (const s of students) {
      const status = statusFor(s.user_id, dateStr, chronic.has(s.user_id));
      batch.push({
        tenant_id: TID,
        student_id: s.user_id,
        class_id: s.class_id,
        date: dateStr,
        status,
        marked_by: marker.id,
        remark: null,
        created_at: date,
      });
      if (batch.length >= 1000) {
        await knex.batchInsert('attendance', batch, 1000);
        inserted += batch.length;
        batch = [];
      }
    }
  }
  if (batch.length) {
    await knex.batchInsert('attendance', batch, 1000);
    inserted += batch.length;
  }

  console.log(`Attendance inserted: ${inserted}`);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
