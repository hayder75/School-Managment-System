#!/usr/bin/env node
/**
 * Validate & seed finance/staff data for NON-TEACHER staff only.
 * - Updates proper full names (first/middle/last), phone, basic_salary,
 *   allowance, joined date, job title.
 * - Sets password to 1234 so they can log in with their phone number.
 * - NEVER touches any user whose role is "teacher" (timetable/homeroom links).
 * Dry-run by default; pass --apply.
 * Usage: node scripts/seed_staff_finance.js /tmp/staff.json [--apply]
 */
const fs = require('fs');
const bcrypt = require('bcrypt');
const db = require('../src/config/database');

const FILE = process.argv.find((a) => a.endsWith('.json'));
const APPLY = process.argv.includes('--apply');

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();

function parseDate(v) {
  const t = String(v || '').trim();
  let m;
  if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})/))) return valid(m[1], m[2], m[3]);
  if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return valid(m[3], m[2], m[1]);
  return null;
}
function valid(y, mo, d) {
  const Y = Number(y), M = Number(mo), D = Number(d);
  if (Y < 1990 || Y > 2030 || M < 1 || M > 12 || D < 1 || D > 31) return null;
  const dt = new Date(Date.UTC(Y, M - 1, D));
  if (dt.getUTCFullYear() !== Y || dt.getUTCMonth() !== M - 1 || dt.getUTCDate() !== D) return null;
  return `${Y}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}`;
}
function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return {};
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
  return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] };
}

async function main() {
  if (!FILE) { console.error('pass a staff .json'); process.exit(1); }
  const src = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const arr = Array.isArray(src) ? src : (src.staff || src.data || []);
  const tenant = await db('tenants').select('id').first();

  const users = await db('users')
    .where({ tenant_id: tenant.id })
    .whereNotIn('role', ['student', 'parent'])
    .select('id', 'first_name', 'middle_name', 'last_name', 'role', 'job_title', 'phone', 'joined_at', 'basic_salary', 'allowance', 'housing_allowance', 'account_allowance', 'phone_allowance');

  const byName = new Map();
  for (const u of users) {
    const k = norm(`${u.first_name} ${u.middle_name || ''} ${u.last_name || ''}`);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(u);
    if (u.phone) { const pk = norm(u.phone); if (!byName.has(pk)) byName.set(pk, [u]); else byName.get(pk).push(u); }
  }

  let skippedTeacher = 0, updated = 0, matched = 0, unmatched = 0, pwReset = 0, joinedSet = 0, salSet = 0;
  const noMatch = [];

  for (const r of arr) {
    const title = String(r.job_title || '').trim();
    const name = String(r.name || '').trim();
    if (/teacher|unit leader/i.test(title)) { skippedTeacher++; continue; } // teacher-ish, never touch
    if (/demissew\s*lemesa/i.test(name)) { skippedTeacher++; continue; } // keep this person's login

    const k = norm(name);
    let cand = byName.get(k) || (r.phone ? byName.get(norm(String(r.phone))) : null);
    if (!cand || !cand.length) { unmatched++; noMatch.push(name + ' | ' + title); continue; }
    cand = cand.filter((u) => u.role !== 'teacher');
    if (!cand.length) { skippedTeacher++; continue; }       // only a teacher matches -> don't touch
    if (cand.length > 1) { cand = [cand[0]]; }               // pick first on ambiguity
    const u = cand[0];
    matched++;

    const { first, middle, last } = splitName(name);
    const joined = parseDate(r.joined);
    const sal = r.salary != null && r.salary !== '' ? Number(r.salary) : null;
    const allow = r.allowance != null && r.allowance !== '' ? Number(r.allowance) : null;
    const ph = String(r.phone || '').trim();

    const patch = { status: 'active' };
    if (first && first !== u.first_name) patch.first_name = first;
    if (last && last !== (u.last_name || '')) patch.last_name = last;
    if (middle && middle !== (u.middle_name || '')) patch.middle_name = middle;
    if (ph && ph !== (u.phone || '')) patch.phone = ph;
    if (title && title !== (u.job_title || '')) patch.job_title = title;
    if (sal != null && !Number.isNaN(sal) && (u.basic_salary == null || Math.abs(Number(u.basic_salary) - sal) > 0.009)) { patch.basic_salary = sal; salSet++; }
    if (allow != null && !Number.isNaN(allow) && allow > 0 && (u.allowance == null || Math.abs(Number(u.allowance) - allow) > 0.009)) patch.allowance = allow;
    if (joined && (u.joined_at == null || String(u.joined_at).slice(0, 10) !== joined)) { patch.joined_at = joined; joinedSet++; }
    patch.password_hash = bcrypt.hashSync('1234', 10);
    pwReset++;

    if (APPLY && Object.keys(patch).length) {
      patch.updated_at = db.fn.now();
      await db('users').where({ id: u.id }).update(patch);
    }
    if (APPLY && Object.keys(patch).length) console.log(`  ${name} (${u.role}): ${Object.keys(patch).filter((x) => x !== 'updated_at').join(', ')}`);
    updated++;
  }

  console.log(JSON.stringify({ mode: APPLY ? 'APPLY' : 'DRY-RUN', seedRows: arr.length, matched, updated, skippedTeacher, unmatched, pwReset, salSet, joinedSet, noMatch: noMatch.slice(0, 15) }, null, 2));
  await db.destroy();
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });