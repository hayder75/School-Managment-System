#!/usr/bin/env node
/**
 * Clean up seeder-created duplicate staff ("*.t@staff.mountolive.edu.et").
 * For each duplicate: move its assignments/timetable to the real roster
 * account, then delete the duplicate.
 * The placeholder "Mr. X (y)" is removed and its timetable entries are left
 * UNASSIGNED (teacher_id = null) so admins can fill them.
 * Dry-run by default; pass --apply.
 */
const db = require('../src/config/database');

const APPLY = process.argv.includes('--apply');
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

async function counts(id) {
  const one = async (t, col) => Number((await db(t).where({ [col]: id }).count('* as c').first()).c);
  return {
    subjects: await one('teacher_subjects', 'teacher_id'),
    timetable: await one('timetable_entries', 'teacher_id'),
    substitutions: await one('teacher_substitutions', 'original_teacher_id') + await one('teacher_substitutions', 'substitute_teacher_id'),
    attendance: await one('staff_attendance', 'staff_id'),
    kpis: await one('teacher_kpi_metrics', 'teacher_id'),
    homeroom: await one('classes', 'class_teacher_id'),
  };
}

async function merge(dupId, canonId) {
  // teacher_subjects: move without clobbering existing (teacher,subject,class)
  const rows = await db('teacher_subjects').where({ teacher_id: dupId });
  for (const r of rows) {
    await db('teacher_subjects')
      .insert({ tenant_id: r.tenant_id, teacher_id: canonId, subject_id: r.subject_id, class_id: r.class_id, is_primary: r.is_primary })
      .onConflict(['teacher_id', 'subject_id', 'class_id']).ignore();
  }
  await db('teacher_subjects').where({ teacher_id: dupId }).del();

  await db('timetable_entries').where({ teacher_id: dupId }).update({ teacher_id: canonId });
  await db('teacher_substitutions').where({ original_teacher_id: dupId }).update({ original_teacher_id: canonId });
  await db('teacher_substitutions').where({ substitute_teacher_id: dupId }).update({ substitute_teacher_id: canonId });
  await db('classes').where({ class_teacher_id: dupId }).update({ class_teacher_id: canonId });
  await db('teacher_kpi_metrics').where({ teacher_id: dupId }).update({ teacher_id: canonId });
  await db('staff_performance_overrides').where({ staff_user_id: dupId }).update({ staff_user_id: canonId });
  await db('staff_attendance').where({ staff_id: dupId }).del();
  await db('users').where({ id: dupId }).del();
}

async function removePlaceholder(dupId) {
  // Leave their timetable slots unassigned rather than deleting the periods.
  await db('timetable_entries').where({ teacher_id: dupId }).update({ teacher_id: null });
  await db('teacher_subjects').where({ teacher_id: dupId }).del();
  await db('users').where({ id: dupId }).del();
}

(async () => {
  const tenant = await db('tenants').select('id').first();
  const staff = await db('users')
    .where({ tenant_id: tenant.id })
    .whereNotIn('role', ['student', 'parent'])
    .select('id', 'first_name', 'last_name', 'email', 'phone');

  const dups = staff.filter((u) => /\.t@staff\.mountolive\.edu\.et$/i.test(u.email));
  const pool = staff.filter((u) => !dups.some((d) => d.id === u.id));

  const proposals = [];
  for (const d of dups) {
    if (/^mr\.?\s*x/i.test(d.first_name)) {
      proposals.push({ type: 'placeholder', dup: d, counts: await counts(d.id) });
      continue;
    }
    const df = norm(d.first_name), dl = norm(d.last_name);
    let best = null, bd = 99;
    for (const c of pool) {
      if (lev(norm(c.first_name), df) > 2) continue;
      if (lev(norm(c.last_name), dl) > 2) continue;
      const sc = lev(norm(`${d.first_name} ${d.last_name}`), norm(`${c.first_name} ${c.last_name}`));
      if (sc < bd) { bd = sc; best = c; }
    }
    proposals.push({ type: best ? 'merge' : 'no-match', dup: d, canonical: best, dist: bd, counts: await counts(d.id) });
  }

  if (APPLY) {
    for (const p of proposals) {
      if (p.type === 'merge') await merge(p.dup.id, p.canonical.id);
      else if (p.type === 'placeholder') await removePlaceholder(p.dup.id);
    }
  }

  console.log(JSON.stringify({
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    duplicates: dups.length,
    proposals: proposals.map((p) => ({
      action: p.type,
      duplicate: `${p.dup.first_name} ${p.dup.last_name}`,
      canonical: p.canonical ? `${p.canonical.first_name} ${p.canonical.last_name}` : null,
      distance: p.dist,
      moves: p.counts,
    })),
  }, null, 2));
  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
