#!/usr/bin/env node
/**
 * Seed staff contact + compensation details from the staff roster JSON
 * (parsed from "All Staff Sep 2026.xlsx").
 * Only fills a field when the source has a non-empty value, so it enriches
 * without wiping good data.
 * Dry-run by default; pass --apply.
 * Usage: node scripts/seed_staff_details.js [staff_details.json] [--apply]
 */
const fs = require('fs');
const db = require('../src/config/database');

const args = process.argv.slice(2);
const FILE = args.find((a) => !a.startsWith('--')) || '/tmp/staff_details.json';
const APPLY = args.includes('--apply');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

function validDate(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function parseDate(v) {
  const t = String(v || '').trim();
  let m;
  if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})/))) return validDate(Number(m[1]), Number(m[2]), Number(m[3]));
  if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return validDate(Number(m[3]), Number(m[2]) || 1, Number(m[1]) || 1);
  return null;
}
function num(v) {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const TEXT_FIELDS = ['phone', 'gender', 'qualification', 'field_of_study', 'job_title'];
const NUM_FIELDS = ['basic_salary', 'allowance', 'housing_allowance', 'account_allowance', 'phone_allowance'];

(async () => {
  const src = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const tenant = await db('tenants').select('id').first();
  const users = await db('users')
    .where({ tenant_id: tenant.id })
    .whereNotIn('role', ['student', 'parent'])
    .select('id', 'first_name', 'last_name', 'phone', 'gender', 'qualification', 'field_of_study', 'job_title', 'joined_at', ...NUM_FIELDS);

  const byName = {};
  for (const u of users) {
    const k = norm(`${u.first_name} ${u.last_name}`);
    (byName[k] = byName[k] || []).push(u);
  }

  const stats = { matched: 0, ambiguous: 0, phone: 0, gender: 0, qualification: 0, field_of_study: 0, job_title: 0, joined_at: 0 };
  for (const f of NUM_FIELDS) stats[f] = 0;
  const noMatch = [];

  for (const r of src) {
    const cand = byName[norm(r.name)];
    if (!cand || !cand.length) { noMatch.push(r.name); continue; }
    if (cand.length > 1) { stats.ambiguous++; continue; }
    const u = cand[0];
    stats.matched++;
    const patch = {};

    for (const f of TEXT_FIELDS) {
      const val = String(r[f] || '').trim();
      if (val && val !== String(u[f] || '')) patch[f] = val;
    }
    for (const f of NUM_FIELDS) {
      const n = num(r[f]);
      if (n !== undefined) patch[f] = n;
    }
    if (!u.joined_at) {
      const jd = parseDate(r.joined);
      if (jd) patch.joined_at = jd;
    }

    for (const k of Object.keys(patch)) stats[k] = (stats[k] || 0) + 1;
    if (APPLY && Object.keys(patch).length) {
      patch.updated_at = db.fn.now();
      await db('users').where({ id: u.id }).update(patch);
    }
    if (APPLY && Object.keys(patch).length) {
      console.log(`  ${r.name}: ${Object.keys(patch).filter((k) => k !== 'updated_at').join(', ')}`);
    }
  }

  console.log(JSON.stringify({
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    sourceRows: src.length,
    staffInDb: users.length,
    ...stats,
    noMatchCount: noMatch.length,
    noMatch,
  }, null, 2));
  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
