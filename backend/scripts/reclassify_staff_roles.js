#!/usr/bin/env node
/**
 * Move non-teaching staff off the `teacher` role so the Teachers page (and
 * anything role=teacher) shows only actual teaching staff.
 * Dry-run by default; pass --apply.
 * Usage: node scripts/reclassify_staff_roles.js [--apply]
 */
const db = require('../src/config/database');

const APPLY = process.argv.includes('--apply');

// job_title (normalized) -> new role
const MAP = {
  security: 'support',
  nanny: 'support',
  janitor: 'support',
  clerk: 'support',
  storekeeper: 'support',
  'general worker': 'support',
  'copy room': 'support',
  gardener: 'support',
  driver: 'support',
  cleaner: 'support',
  guard: 'support',
  laundry: 'support',
};

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

(async () => {
  const teachers = await db('users')
    .where({ role: 'teacher' })
    .select('id', 'first_name', 'last_name', 'job_title');

  const changes = [];
  for (const u of teachers) {
    const target = MAP[norm(u.job_title)];
    if (target) changes.push({ id: u.id, name: `${u.first_name} ${u.last_name}`, job_title: u.job_title, to: target });
  }

  const byTitle = {};
  for (const c of changes) byTitle[c.job_title] = (byTitle[c.job_title] || 0) + 1;

  if (APPLY) {
    for (const c of changes) {
      await db('users').where({ id: c.id }).update({ role: c.to, updated_at: db.fn.now() });
    }
  }

  console.log(JSON.stringify({
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    teachersBefore: teachers.length,
    willMove: changes.length,
    byJobTitle: byTitle,
    list: changes.slice(0, 60),
  }, null, 2));

  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
