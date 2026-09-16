#!/usr/bin/env node
/**
 * Seed performance criteria (starter) + historical scores.
 * Dry-run by default; pass --apply. Usage: node scripts/seed_performance.js <seedDir> [--apply]
 */
const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

const args = process.argv.slice(2);
const SEED_DIR = args.find((a) => !a.startsWith('--')) || '/tmp/seed';
const APPLY = args.includes('--apply');
const read = (f) => (fs.existsSync(path.join(SEED_DIR, f)) ? JSON.parse(fs.readFileSync(path.join(SEED_DIR, f), 'utf8')) : []);

const STARTER_CRITERIA = [
  { name: 'Punctuality & Attendance', weight: 20 },
  { name: 'Lesson Delivery & Syllabus Completion', weight: 25 },
  { name: 'Student Results', weight: 20 },
  { name: 'Classroom Management', weight: 10 },
  { name: 'Cooperation & Teamwork', weight: 10 },
  { name: 'Parent / Guardian Communication', weight: 10 },
  { name: 'Professional Development', weight: 5 },
];

(async () => {
  const tenant = await db('tenants').select('id').first();
  const tenantId = tenant.id;
  const scores = read('performance_scores.json');
  const plan = { criteria: 0, scores: 0 };

  let order = 0;
  for (const c of STARTER_CRITERIA) {
    const ex = await db('staff_performance_criteria').where({ tenant_id: tenantId, name: c.name }).first();
    if (!ex) { plan.criteria++; if (APPLY) await db('staff_performance_criteria').insert({ tenant_id: tenantId, name: c.name, weight: c.weight, sort_order: order }); }
    order += 1;
  }

  for (const s of scores) {
    const ex = await db('staff_performance_scores').where({ tenant_id: tenantId, staff_name: s.staff_name, academic_year: s.academic_year, semester: s.semester }).first();
    if (ex) continue;
    plan.scores++;
    if (APPLY) await db('staff_performance_scores').insert({ tenant_id: tenantId, staff_name: s.staff_name, job_title: s.job_title, academic_year: s.academic_year, semester: s.semester, score: s.score });
  }

  console.log(JSON.stringify({ mode: APPLY ? 'APPLY' : 'DRY-RUN', plan }, null, 2));
  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
