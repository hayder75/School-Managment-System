const knex = require('../../config/database');
const settingsService = require('../settings/settings.service');

// All roles that count as "staff" for staff attendance
const STAFF_ROLES = [
  'teacher', 'hr', 'admin', 'owner', 'finance', 'cashier', 'accountant',
  'support', 'general_services', 'security_head', 'shift_coordinator',
  'principal', 'vice_principal', 'quality_director', 'general_manager',
];

const ATTENDANCE_SETTINGS_KEY = 'staff_attendance';

const DEFAULT_ATTENDANCE_SETTINGS = {
  deduction_enabled: true,
  working_days: 30,
  fixed_daily_rate: null, // birr deducted per unpaid day
  deduction_percent: 0, // percent of basic pay deducted per unpaid day
};

function round2(v) {
  return Math.round((Number(v) || 0) * 100) / 100;
}

function dateKey(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

function startOfWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // move to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

// Monday..Friday (5 working-day columns)
function weekDates(start) {
  return Array.from({ length: 5 }, (_, i) => addDays(start, i));
}

function isLeave(status) {
  return status === 'leave' || status === 'on_leave';
}

function unpaidWeight(status) {
  if (status === 'absent') return 1;
  if (status === 'half_day') return 0.5;
  return 0;
}

function summarizeDays(days) {
  const stats = {
    present: 0, absent: 0, late: 0, leave: 0, emergency: 0,
    half_day: 0, unmarked: 0, unpaid_days: 0,
  };
  for (const d of days) {
    const s = d.status;
    if (!s) stats.unmarked++;
    else if (s === 'present') stats.present++;
    else if (s === 'late') stats.late++;
    else if (s === 'absent') stats.absent++;
    else if (isLeave(s)) stats.leave++;
    else if (s === 'emergency') stats.emergency++;
    else if (s === 'half_day') stats.half_day++;
    else stats.unmarked++;
    stats.unpaid_days += unpaidWeight(s);
  }
  const marked = days.length - stats.unmarked;
  stats.marked = marked;
  stats.attendance_rate = marked > 0 ? round2(((stats.present + stats.late + stats.leave + stats.emergency) / marked) * 100) : 0;
  stats.unpaid_days = round2(stats.unpaid_days);
  return stats;
}

function buildStaffQuery(tenantId, { role, search } = {}) {
  let q = knex('users')
    .where('tenant_id', tenantId)
    .whereIn('role', STAFF_ROLES)
    .where('status', 'active')
    .select('id', 'first_name', 'last_name', 'role', 'email', 'job_title', 'phone');
  if (role) q = q.where('role', role);
  if (search) {
    q = q.where((b) =>
      b.whereILike('first_name', `%${search}%`)
        .orWhereILike('last_name', `%${search}%`)
        .orWhereILike('email', `%${search}%`)
    );
  }
  return q.orderBy([{ column: 'role' }, { column: 'first_name' }]);
}

// --- Staff / Teacher Attendance ---

async function listStaffAttendance(tenantId, { date, month, staffId, role, search, from, to } = {}) {
  let query = knex('staff_attendance as sa')
    .join('users as u', 'sa.staff_id', 'u.id')
    .leftJoin('users as rec', 'sa.recorded_by', 'rec.id')
    .where('sa.tenant_id', tenantId)
    .select(
      'sa.*',
      knex.raw("CONCAT(u.first_name, ' ', u.last_name) as staff_name"),
      'u.role',
      'u.email',
      knex.raw("CONCAT(rec.first_name, ' ', rec.last_name) as recorded_by_name")
    )
    .orderBy('sa.date', 'desc')
    .orderBy('u.first_name');

  if (date) query = query.where('sa.date', date);
  if (from) query = query.where('sa.date', '>=', from);
  if (to) query = query.where('sa.date', '<=', to);
  if (month) query = query.whereRaw("TO_CHAR(sa.date, 'YYYY-MM') = ?", [month]);
  if (staffId) query = query.where('sa.staff_id', staffId);
  if (role) query = query.where('u.role', role);
  if (search) {
    query = query.where((b) =>
      b.whereILike('u.first_name', `%${search}%`)
        .orWhereILike('u.last_name', `%${search}%`)
        .orWhereILike('u.email', `%${search}%`)
    );
  }

  return await query;
}

async function upsertAttendance(tenantId, recordedBy, { staffId, date, status, checkIn, checkOut, notes }) {
  const existing = await knex('staff_attendance')
    .where({ tenant_id: tenantId, staff_id: staffId, date })
    .first();

  if (existing) {
    const [updated] = await knex('staff_attendance')
      .where({ id: existing.id })
      .update({
        status,
        check_in: checkIn || null,
        check_out: checkOut || null,
        notes: notes || null,
        recorded_by: recordedBy,
        updated_at: knex.fn.now(),
      })
      .returning('*');
    return updated;
  }

  const [inserted] = await knex('staff_attendance')
    .insert({
      tenant_id: tenantId,
      staff_id: staffId,
      date,
      status: status || 'present',
      check_in: checkIn || null,
      check_out: checkOut || null,
      notes: notes || null,
      recorded_by: recordedBy,
    })
    .returning('*');
  return inserted;
}

async function bulkMarkAttendance(tenantId, recordedBy, { date, records }) {
  const results = [];
  for (const item of records) {
    results.push(await upsertAttendance(tenantId, recordedBy, {
      staffId: item.staffId,
      date,
      status: item.status,
      checkIn: item.checkIn,
      checkOut: item.checkOut,
      notes: item.notes,
    }));
  }
  return results;
}

// entries: [{ staffId, date, status, checkIn, checkOut, notes }]
async function bulkMarkRange(tenantId, recordedBy, { entries = [] }) {
  const results = [];
  for (const e of entries) {
    results.push(await upsertAttendance(tenantId, recordedBy, {
      staffId: e.staffId,
      date: e.date,
      status: e.status,
      checkIn: e.checkIn,
      checkOut: e.checkOut,
      notes: e.notes,
    }));
  }
  return results;
}

async function getStaffAttendanceSummary(tenantId, { date = new Date().toISOString().split('T')[0], role } = {}) {
  let staffQuery = knex('users')
    .where('tenant_id', tenantId)
    .whereIn('role', STAFF_ROLES)
    .where('status', 'active')
    .select('id', 'first_name', 'last_name', 'role', 'email');
  if (role) staffQuery = staffQuery.where('role', role);
  const staffList = await staffQuery.orderBy('first_name');

  const attendanceRecords = await knex('staff_attendance')
    .where({ tenant_id: tenantId, date })
    .select('*');

  const recordMap = new Map();
  attendanceRecords.forEach((r) => recordMap.set(r.staff_id, r));

  const stats = { totalStaff: staffList.length, present: 0, late: 0, absent: 0, onLeave: 0, emergency: 0, halfDay: 0, unmarked: 0 };

  const combined = staffList.map((s) => {
    const rec = recordMap.get(s.id);
    const status = rec ? rec.status : 'unmarked';
    if (status === 'present') stats.present++;
    else if (status === 'late') stats.late++;
    else if (status === 'absent') stats.absent++;
    else if (isLeave(status)) stats.onLeave++;
    else if (status === 'emergency') stats.emergency++;
    else if (status === 'half_day') stats.halfDay++;
    else stats.unmarked++;

    return {
      staffId: s.id,
      name: `${s.first_name} ${s.last_name}`,
      role: s.role,
      email: s.email,
      status: rec ? rec.status : 'present',
      checkIn: rec ? rec.check_in : '08:00',
      checkOut: rec ? rec.check_out : '16:30',
      notes: rec ? rec.notes : '',
    };
  });

  return { stats, staff: combined };
}

// Weekly grid: rows = staff, columns = Mon..Sat of weekStart
async function getStaffAttendanceGrid(tenantId, { weekStart, role, search } = {}) {
  const base = dateKey(weekStart) || new Date().toISOString().split('T')[0];
  const start = startOfWeek(base);
  const dates = weekDates(start);

  const staff = await buildStaffQuery(tenantId, { role, search });
  const ids = staff.map((s) => s.id);

  let records = [];
  if (ids.length) {
    records = await knex('staff_attendance')
      .where({ tenant_id: tenantId })
      .whereIn('staff_id', ids)
      .whereBetween('date', [dates[0], dates[dates.length - 1]])
      .select('*');
  }
  const map = new Map();
  records.forEach((r) => map.set(`${r.staff_id}|${dateKey(r.date)}`, r));

  const totals = { present: 0, absent: 0, late: 0, leave: 0, emergency: 0, half_day: 0, unmarked: 0, unpaid_days: 0 };

  const rows = staff.map((s) => {
    const days = dates.map((d) => {
      const rec = map.get(`${s.id}|${d}`);
      return {
        date: d,
        status: rec ? rec.status : null,
        check_in: rec ? rec.check_in : null,
        check_out: rec ? rec.check_out : null,
        notes: rec ? rec.notes : null,
      };
    });
    const stats = summarizeDays(days);
    for (const k of Object.keys(totals)) totals[k] += stats[k] || 0;
    return {
      staff_id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      role: s.role,
      email: s.email,
      job_title: s.job_title,
      days,
      stats,
    };
  });

  totals.unpaid_days = round2(totals.unpaid_days);

  return {
    week_start: start,
    week_end: dates[dates.length - 1],
    dates,
    rows,
    totals,
  };
}

// Per-staff aggregates over a date range (used by stats panel + payroll impact)
async function getStaffAttendanceStats(tenantId, { from, to, staffId, role, search } = {}) {
  const today = new Date().toISOString().split('T')[0];
  const end = dateKey(to) || today;
  const begin = dateKey(from) || `${end.slice(0, 7)}-01`;

  const staff = await buildStaffQuery(tenantId, { role, search });
  const filtered = staffId ? staff.filter((s) => s.id === staffId) : staff;
  const ids = filtered.map((s) => s.id);

  let records = [];
  if (ids.length) {
    records = await knex('staff_attendance')
      .where({ tenant_id: tenantId })
      .whereIn('staff_id', ids)
      .whereBetween('date', [begin, end])
      .select('staff_id', 'status');
  }

  const byStaff = new Map();
  records.forEach((r) => {
    if (!byStaff.has(r.staff_id)) {
      byStaff.set(r.staff_id, { present: 0, absent: 0, late: 0, leave: 0, emergency: 0, half_day: 0, unmarked: 0, unpaid_days: 0 });
    }
    const s = byStaff.get(r.staff_id);
    if (r.status === 'present') s.present++;
    else if (r.status === 'late') s.late++;
    else if (r.status === 'absent') s.absent++;
    else if (isLeave(r.status)) s.leave++;
    else if (r.status === 'emergency') s.emergency++;
    else if (r.status === 'half_day') s.half_day++;
    s.unpaid_days += unpaidWeight(r.status);
  });

  const totals = { present: 0, absent: 0, late: 0, leave: 0, emergency: 0, half_day: 0, unpaid_days: 0 };
  const rows = filtered.map((s) => {
    const c = byStaff.get(s.id) || { present: 0, absent: 0, late: 0, leave: 0, emergency: 0, half_day: 0, unpaid_days: 0 };
    const marked = c.present + c.absent + c.late + c.leave + c.emergency + c.half_day;
    const result = {
      staff_id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      role: s.role,
      email: s.email,
      present: c.present,
      absent: c.absent,
      late: c.late,
      leave: c.leave,
      emergency: c.emergency,
      half_day: c.half_day,
      marked,
      unpaid_days: round2(c.unpaid_days),
      attendance_rate: marked > 0 ? round2(((c.present + c.late + c.leave + c.emergency) / marked) * 100) : 0,
    };
    totals.present += c.present;
    totals.absent += c.absent;
    totals.late += c.late;
    totals.leave += c.leave;
    totals.emergency += c.emergency;
    totals.half_day += c.half_day;
    totals.unpaid_days += c.unpaid_days;
    return result;
  });

  totals.unpaid_days = round2(totals.unpaid_days);

  return { from: begin, to: end, totals, staff: rows };
}

async function getStaffAttendanceSettings(tenantId) {
  const stored = await settingsService.getByKey(tenantId, ATTENDANCE_SETTINGS_KEY);
  return { ...DEFAULT_ATTENDANCE_SETTINGS, ...(stored || {}) };
}

async function updateStaffAttendanceSettings(tenantId, data = {}) {
  const current = await getStaffAttendanceSettings(tenantId);
  const next = {
    deduction_enabled: data.deduction_enabled != null ? !!data.deduction_enabled : current.deduction_enabled,
    working_days: data.working_days != null ? Number(data.working_days) || 30 : current.working_days,
    fixed_daily_rate: data.fixed_daily_rate != null && data.fixed_daily_rate !== '' ? Number(data.fixed_daily_rate) : null,
    deduction_percent: data.deduction_percent != null && data.deduction_percent !== '' ? Number(data.deduction_percent) : 0,
  };
  await settingsService.set(tenantId, ATTENDANCE_SETTINGS_KEY, next);
  return next;
}

// Teachers/staff who are unavailable (leave or emergency) on given dates.
// Combines marked staff_attendance with approved leave requests.
async function getStaffUnavailability(tenantId, { from, to } = {}) {
  const today = new Date().toISOString().split('T')[0];
  const end = dateKey(to) || today;
  const begin = dateKey(from) || end;
  const map = new Map();

  const att = await knex('staff_attendance')
    .where({ tenant_id: tenantId })
    .whereIn('status', ['leave', 'on_leave', 'emergency'])
    .whereBetween('date', [begin, end])
    .select('staff_id', 'date', 'status', 'notes');
  for (const r of att) {
    const d = dateKey(r.date);
    map.set(`${r.staff_id}|${d}`, {
      staff_id: r.staff_id,
      date: d,
      status: r.status === 'on_leave' ? 'leave' : r.status,
      source: 'attendance',
      note: r.notes || null,
    });
  }

  const leaves = await knex('leaves')
    .where({ tenant_id: tenantId, status: 'approved' })
    .where('start_date', '<=', end)
    .where('end_date', '>=', begin)
    .select('staff_id', 'start_date', 'end_date', 'leave_type');
  for (const l of leaves) {
    let d = dateKey(l.start_date) < begin ? begin : dateKey(l.start_date);
    const last = dateKey(l.end_date) > end ? end : dateKey(l.end_date);
    while (d <= last) {
      const key = `${l.staff_id}|${d}`;
      if (!map.has(key)) {
        map.set(key, { staff_id: l.staff_id, date: d, status: 'leave', source: 'leave', note: l.leave_type });
      }
      d = addDays(d, 1);
    }
  }

  return { from: begin, to: end, items: Array.from(map.values()) };
}

// Unpaid days for a single staff member over a range (absent=1, half_day=0.5, leave/emergency=0)
async function computeUnpaidDays(tenantId, staffId, from, to) {
  const rows = await knex('staff_attendance')
    .where({ tenant_id: tenantId, staff_id: staffId })
    .whereBetween('date', [from, to])
    .select('status');
  let absent = 0;
  let half = 0;
  let unpaid = 0;
  for (const r of rows) {
    if (r.status === 'absent') { unpaid += 1; absent++; }
    else if (r.status === 'half_day') { unpaid += 0.5; half++; }
  }
  return { unpaid_days: round2(unpaid), absent_days: absent, half_days: half };
}

// --- Teacher KPI Metrics ---

async function listTeacherKpis(tenantId, { periodName, teacherId } = {}) {
  let query = knex('teacher_kpi_metrics as kpi')
    .join('users as t', 'kpi.teacher_id', 't.id')
    .leftJoin('users as eval', 'kpi.evaluated_by', 'eval.id')
    .where('kpi.tenant_id', tenantId)
    .select(
      'kpi.*',
      knex.raw("CONCAT(t.first_name, ' ', t.last_name) as teacher_name"),
      't.email as teacher_email',
      knex.raw("CONCAT(eval.first_name, ' ', eval.last_name) as evaluator_name")
    )
    .orderBy('kpi.created_at', 'desc');

  if (periodName) query = query.where('kpi.period_name', periodName);
  if (teacherId) query = query.where('kpi.teacher_id', teacherId);
  return await query;
}

async function saveTeacherKpi(tenantId, evaluatedBy, data) {
  const attendanceRate = parseFloat(data.attendanceRate || 100);
  const punctualityRate = parseFloat(data.punctualityRate || 100);
  const substitutionsCovered = parseInt(data.substitutionsCovered || 0, 10);
  const studentFeedbackScore = parseFloat(data.studentFeedbackScore || 4.5);
  const syllabusCompletionRate = parseFloat(data.syllabusCompletionRate || 90);

  const overall = (
    (attendanceRate / 100) * 1.0 +
    (punctualityRate / 100) * 1.0 +
    studentFeedbackScore * 0.5 +
    (syllabusCompletionRate / 100) * 1.5
  ).toFixed(2);

  const existing = await knex('teacher_kpi_metrics')
    .where({ tenant_id: tenantId, teacher_id: data.teacherId, period_name: data.periodName })
    .first();

  if (existing) {
    const [updated] = await knex('teacher_kpi_metrics')
      .where({ id: existing.id })
      .update({
        attendance_rate: attendanceRate,
        punctuality_rate: punctualityRate,
        substitutions_covered: substitutionsCovered,
        student_feedback_score: studentFeedbackScore,
        syllabus_completion_rate: syllabusCompletionRate,
        overall_rating: overall,
        comments: data.comments || null,
        evaluated_by: evaluatedBy,
        updated_at: knex.fn.now(),
      })
      .returning('*');
    return updated;
  }

  const [inserted] = await knex('teacher_kpi_metrics')
    .insert({
      tenant_id: tenantId,
      teacher_id: data.teacherId,
      period_name: data.periodName || 'Q1 2026',
      attendance_rate: attendanceRate,
      punctuality_rate: punctualityRate,
      substitutions_covered: substitutionsCovered,
      student_feedback_score: studentFeedbackScore,
      syllabus_completion_rate: syllabusCompletionRate,
      overall_rating: overall,
      comments: data.comments || null,
      evaluated_by: evaluatedBy,
    })
    .returning('*');
  return inserted;
}

async function getKpiSummary(tenantId) {
  const teachers = await knex('users')
    .where({ tenant_id: tenantId, role: 'teacher', status: 'active' })
    .select('id', 'first_name', 'last_name', 'email');

  const kpiRecords = await knex('teacher_kpi_metrics')
    .where('tenant_id', tenantId)
    .orderBy('created_at', 'desc');

  const [averages] = await knex('teacher_kpi_metrics')
    .where('tenant_id', tenantId)
    .select(
      knex.raw('COALESCE(AVG(overall_rating), 4.5)::numeric(3,2) as avg_rating'),
      knex.raw('COALESCE(AVG(attendance_rate), 95.0)::numeric(5,2) as avg_attendance'),
      knex.raw('COALESCE(AVG(student_feedback_score), 4.4)::numeric(3,2) as avg_feedback'),
      knex.raw('COALESCE(SUM(substitutions_covered), 0)::integer as total_substitutions')
    );

  return { totalTeachers: teachers.length, averages, teachers, kpiRecords };
}

module.exports = {
  STAFF_ROLES,
  listStaffAttendance,
  bulkMarkAttendance,
  bulkMarkRange,
  getStaffAttendanceSummary,
  getStaffAttendanceGrid,
  getStaffAttendanceStats,
  getStaffAttendanceSettings,
  updateStaffAttendanceSettings,
  computeUnpaidDays,
  getStaffUnavailability,
  listTeacherKpis,
  saveTeacherKpi,
  getKpiSummary,
};
