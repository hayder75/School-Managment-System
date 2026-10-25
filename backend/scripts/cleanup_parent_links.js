#!/usr/bin/env node
/**
 * Clean up bad parent↔student links created from a shared/duplicated guardian
 * phone in the source data.
 *
 * Keeps a link when the parent's name fuzzy-matches the student's father's or
 * mother's given name (or the surname matches the grandfather), tolerating
 * spelling variants. Removes links where the names clearly don't belong.
 * Removed links are written to a CSV before deletion. Dry-run by default.
 *
 * Usage: node scripts/cleanup_parent_links.js [--apply] [--threshold=0.72]
 */
const fs = require('fs');
const db = require('../src/config/database');

const APPLY = process.argv.includes('--apply');
const thrArg = process.argv.find((a) => a.startsWith('--threshold='));
const THRESHOLD = thrArg ? Number(thrArg.split('=')[1]) : 0.72;

const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}]/gu, '');
const words = (s) => String(s || '').trim().split(/\s+/).map(norm).filter(Boolean);

function lev(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function sim(a, b) {
  if (!a || !b) return 0;
  return 1 - lev(a, b) / Math.max(a.length, b.length);
}

// Tolerate small spelling differences: up to 1 edit for short names, 2 for
// longer ones, or a high similarity ratio.
function closeEnough(a, b) {
  if (!a || !b) return false;
  const maxLen = Math.max(a.length, b.length);
  const allowed = maxLen <= 4 ? 1 : 2;
  return lev(a, b) <= allowed || sim(a, b) >= THRESHOLD;
}

function anyMatch(as, bs) {
  for (const a of as) for (const b of bs) if (closeEnough(a, b)) return true;
  return false;
}

function linkLooksValid(row) {
  const pFirst = words(row.parent_first_name);
  const pLast = words(row.parent_last_name);
  const father = words(row.father_name);
  const mother = words(row.mother_name);
  const grand = words(row.grandfather_name);
  if (anyMatch(pFirst, father)) return true;
  if (anyMatch(pFirst, mother)) return true;
  if (anyMatch(pLast, grand)) return true;
  return false;
}

async function main() {
  const rows = await db('student_parents as sp')
    .join('users as p', 'p.id', 'sp.parent_id')
    .join('students as s', 's.id', 'sp.student_id')
    .join('users as su', 'su.id', 's.user_id')
    .select(
      'sp.id as link_id',
      'sp.tenant_id',
      'p.first_name as parent_first_name',
      'p.last_name as parent_last_name',
      'p.phone as parent_phone',
      's.student_number',
      'su.first_name as student_first_name',
      'su.last_name as student_last_name',
      's.father_name',
      's.mother_name',
      's.grandfather_name'
    );

  let keep = 0;
  let remove = 0;
  const bad = [];
  for (const r of rows) {
    if (linkLooksValid(r)) keep++;
    else { remove++; bad.push(r); }
  }

  console.log(JSON.stringify({
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    threshold: THRESHOLD,
    totalLinks: rows.length,
    keep,
    remove,
    sampleRemoved: bad.slice(0, 15).map((b) => ({
      parent: `${b.parent_first_name || ''} ${b.parent_last_name || ''}`.trim(),
      phone: b.parent_phone,
      student: `${b.student_first_name || ''} ${b.student_last_name || ''}`.trim(),
      num: b.student_number,
      father: b.father_name,
      grandfather: b.grandfather_name,
    })),
  }, null, 2));

  if (APPLY && bad.length) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = `/var/www/sms/backend/scripts/removed_parent_links_${stamp}.csv`;
    const header = 'link_id,parent,phone,student,student_number,father_name,grandfather_name\n';
    const csv = bad.map((b) => [
      b.link_id,
      `"${`${b.parent_first_name || ''} ${b.parent_last_name || ''}`.trim()}"`,
      b.parent_phone || '',
      `"${`${b.student_first_name || ''} ${b.student_last_name || ''}`.trim()}"`,
      b.student_number || '',
      `"${b.father_name || ''}"`,
      `"${b.grandfather_name || ''}"`,
    ].join(',')).join('\n');
    fs.writeFileSync(file, header + csv);
    console.log('backup written:', file);

    const ids = bad.map((b) => b.link_id);
    const BATCH = 500;
    for (let i = 0; i < ids.length; i += BATCH) {
      await db('student_parents').whereIn('id', ids.slice(i, i + BATCH)).del();
    }
    console.log('deleted', ids.length);
  }

  await db.destroy();
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });