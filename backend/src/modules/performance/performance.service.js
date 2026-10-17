const db = require('../../config/database');

async function listCriteria(tenantId) {
  return db('staff_performance_criteria').where({ tenant_id: tenantId }).orderBy('sort_order').orderBy('name');
}

async function createCriteria(tenantId, data) {
  const [row] = await db('staff_performance_criteria').insert({
    tenant_id: tenantId,
    name: data.name,
    description: data.description || null,
    weight: data.weight ?? 0,
    auto_source: data.auto_source || null,
    is_active: data.is_active !== false,
    sort_order: data.sort_order ?? 0,
  }).returning('*');
  return row;
}

async function updateCriteria(tenantId, id, data) {
  const patch = {};
  for (const k of ['name', 'description', 'weight', 'auto_source', 'is_active', 'sort_order']) {
    if (data[k] !== undefined) patch[k] = data[k];
  }
  patch.updated_at = db.fn.now();
  const [row] = await db('staff_performance_criteria').where({ tenant_id: tenantId, id }).update(patch).returning('*');
  return row;
}

async function removeCriteria(tenantId, id) {
  return db('staff_performance_criteria').where({ tenant_id: tenantId, id }).del();
}

async function listScores(tenantId, { academic_year } = {}) {
  let q = db('staff_performance_scores as s')
    .leftJoin('users as u', 's.staff_user_id', 'u.id')
    .where('s.tenant_id', tenantId)
    .select('s.*', 'u.first_name', 'u.last_name')
    .orderBy('s.staff_name')
    .orderBy('s.academic_year')
    .orderBy('s.semester');
  if (academic_year) q = q.where('s.academic_year', academic_year);
  return q;
}

// ── Monthly performance ──────────────────────────────────────────────────────

function monthRange(period) {
  const [y, m] = period.split('-').map(Number);
  const start = `${period}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${period}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Attendance score: absences hurt, approved leave and half-days count partially.
function attendanceScore(a) {
  if (!a || !a.total) return null;
  const effective = a.present + a.on_leave + 0.5 * a.half_day;
  return round2((effective / a.total) * 100);
}

// Punctuality score: share of recorded days the person was on time.
function punctualityScore(a) {
  if (!a || !a.total) return null;
  return round2(((a.total - a.late) / a.total) * 100);
}

function autoValue(source, metrics) {
  if (!source) return null;
  if (source === 'attendance') return attendanceScore(metrics.attendance);
  if (source === 'punctuality') return punctualityScore(metrics.attendance);
  if (source === 'attendance_punctuality') {
    const a = attendanceScore(metrics.attendance);
    const p = punctualityScore(metrics.attendance);
    const vals = [a, p].filter((v) => v !== null);
    if (!vals.length) return null;
    return round2(vals.reduce((s, v) => s + v, 0) / vals.length);
  }
  if (source === 'student_results') return metrics.result_pct;
  return null;
}

async function listStaff(tenantId) {
  return db('users')
    .where({ tenant_id: tenantId })
    .whereNotIn('role', ['student', 'parent', 'super_admin'])
    .whereNot('status', 'inactive')
    .select('id', 'first_name', 'last_name', 'role', 'job_title', 'status')
    .orderBy('role')
    .orderBy('first_name');
}

async function getMonthly(tenantId, period) {
  const { start, end } = monthRange(period);

  const [criteria, staff, attRows, resultRows, overrides] = await Promise.all([
    db('staff_performance_criteria').where({ tenant_id: tenantId, is_active: true }).orderBy('sort_order').orderBy('name'),
    listStaff(tenantId),
    db('staff_attendance')
      .where({ tenant_id: tenantId })
      .whereBetween('date', [start, end])
      .groupBy('staff_id', 'status')
      .select('staff_id', 'status')
      .count('* as count'),
    db('grades as g')
      .join('exams as e', 'g.exam_id', 'e.id')
      .join('teacher_subjects as ts', function joinAssignments() {
        this.on('ts.class_id', '=', 'e.class_id').andOn('ts.subject_id', '=', 'e.subject_id');
      })
      .where('e.tenant_id', tenantId)
      .whereBetween('e.date', [start, end])
      .whereNotNull('g.marks_obtained')
      .whereNotNull('e.total_marks')
      .where('e.total_marks', '>', 0)
      .groupBy('ts.teacher_id')
      .select('ts.teacher_id')
      .select(db.raw('AVG(g.marks_obtained / e.total_marks * 100) as avg_pct')),
    db('staff_performance_overrides').where({ tenant_id: tenantId, period }),
  ]);

  const attendanceMap = {};
  for (const r of attRows) {
    const a = (attendanceMap[r.staff_id] ||= { present: 0, late: 0, absent: 0, half_day: 0, on_leave: 0, total: 0 });
    let status = String(r.status || '').toLowerCase();
    if (status.includes('half')) status = 'half_day';
    else if (status.includes('leave')) status = 'on_leave';
    else if (status.includes('late')) status = 'late';
    else if (status.includes('absent')) status = 'absent';
    else if (status.includes('present')) status = 'present';
    a[status] = (a[status] || 0) + Number(r.count);
    a.total += Number(r.count);
  }

  const resultMap = {};
  for (const r of resultRows) {
    const v = num(r.avg_pct);
    if (v !== null) resultMap[r.teacher_id] = round2(v);
  }

  const overrideMap = {};
  for (const o of overrides) {
    overrideMap[`${o.staff_user_id}|${o.criteria_id}`] = o;
  }

  const totalWeight = criteria.reduce((s, c) => s + Number(c.weight || 0), 0);

  const rows = staff.map((s) => {
    const attendance = attendanceMap[s.id] || null;
    const resultPct = resultMap[s.id] ?? null;
    const metrics = { attendance, result_pct: resultPct };

    let weighted = 0;
    let reviewed = false;
    const items = criteria.map((c) => {
      const computed = autoValue(c.auto_source, metrics);
      const ov = overrideMap[`${s.id}|${c.id}`];
      const value = ov ? num(ov.value) : (computed ?? 100);
      if (ov) reviewed = true;
      weighted += (value * Number(c.weight || 0)) / 100;
      return {
        criteria_id: c.id,
        name: c.name,
        weight: Number(c.weight || 0),
        auto_source: c.auto_source || null,
        computed_value: computed,
        value,
        is_overridden: !!ov,
        comment: ov ? ov.comment : null,
        updated_by: ov ? ov.updated_by : null,
      };
    });

    const score = totalWeight > 0 ? round2((weighted / totalWeight) * 100) : 0;
    const a = attendance || { present: 0, late: 0, absent: 0, half_day: 0, on_leave: 0, total: 0 };

    return {
      staff: { id: s.id, name: `${s.first_name || ''} ${s.last_name || ''}`.trim(), role: s.role, job_title: s.job_title },
      metrics: {
        days_recorded: a.total,
        present: a.present,
        late: a.late,
        absent: a.absent,
        half_day: a.half_day,
        on_leave: a.on_leave,
        result_pct: resultPct,
      },
      items,
      score,
      status: reviewed ? 'reviewed' : 'auto',
    };
  });

  return { period, criteria, rows, total_weight: totalWeight };
}

async function saveMonthly(tenantId, staffUserId, period, userId, items) {
  const valid = await db('staff_performance_criteria')
    .where({ tenant_id: tenantId })
    .whereIn('id', items.map((i) => i.criteria_id))
    .pluck('id');
  const validSet = new Set(valid);

  for (const item of items) {
    if (!validSet.has(item.criteria_id)) continue;
    const clear = item.value === null || item.value === undefined || item.value === '';
    if (clear) {
      await db('staff_performance_overrides')
        .where({ tenant_id: tenantId, staff_user_id: staffUserId, period, criteria_id: item.criteria_id })
        .del();
      continue;
    }
    const value = Math.max(0, Math.min(100, Number(item.value)));
    await db('staff_performance_overrides')
      .insert({
        tenant_id: tenantId,
        staff_user_id: staffUserId,
        period,
        criteria_id: item.criteria_id,
        value,
        comment: item.comment || null,
        updated_by: userId,
      })
      .onConflict(['tenant_id', 'staff_user_id', 'period', 'criteria_id'])
      .merge({ value, comment: item.comment || null, updated_by: userId, updated_at: db.fn.now() });
  }
  return { saved: items.length };
}

module.exports = {
  listCriteria, createCriteria, updateCriteria, removeCriteria, listScores,
  getMonthly, saveMonthly,
};
