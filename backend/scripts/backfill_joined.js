#!/usr/bin/env node
/**
 * Backfill users.joined_at from the staff seed file.
 * Dry-run by default; pass --apply.
 * Usage: node scripts/backfill_joined.js [staff.json] [--apply]
 */
const fs = require('fs');
const db = require('../src/config/database');

const args = process.argv.slice(2);
const FILE = args.find((a) => !a.startsWith('--')) || '/home/hayder/sms/new real datat/seed/staff.json';
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

(async () => {
  const staff = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const tenant = await db('tenants').select('id').first();
  const users = await db('users')
    .where({ tenant_id: tenant.id })
    .whereNotIn('role', ['student', 'parent'])
    .select('id', 'first_name', 'last_name', 'joined_at', 'role');

  const byName = {};
  for (const u of users) {
    const k = norm(`${u.first_name} ${u.last_name}`);
    (byName[k] = byName[k] || []).push(u);
  }

  let toSet = 0, alreadyHave = 0, ambiguous = 0, invalidDate = 0;
  const noMatch = [];
  const samples = [];

  for (const r of staff) {
    const jd = parseDate(r.joined);
    if (!jd) { invalidDate++; continue; }
    const cand = byName[norm(r.name)];
    if (!cand || !cand.length) { noMatch.push(r.name); continue; }
    if (cand.length > 1) { ambiguous++; continue; }
    const u = cand[0];
    if (u.joined_at) { alreadyHave++; continue; }
    toSet++;
    if (samples.length < 10) samples.push(`${r.name} -> ${jd} (${u.role})`);
    if (APPLY) await db('users').where({ id: u.id }).update({ joined_at: jd, updated_at: db.fn.now() });
  }

  console.log(JSON.stringify({
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    staffRows: staff.length,
    toSet, alreadyHave, ambiguous, invalidDate,
    noMatchCount: noMatch.length,
    noMatch: noMatch.slice(0, 25),
    samples,
  }, null, 2));
  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
