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
  // Two sessions per day: an absent session is half a day.
  if (status === 'absent') return 0.5;
  if (status === 'half_day') return 0.5;
  return 0;
}

// Summarise a flat list of session statuses. Unmarked sessions default to
// present (staff are present unless marked otherwise). Each absent/half-day
// session counts 0.5 of an unpaid day, so a full absent day = 1.
function summarizeStatuses(statuses) {
  const stats = {
    present: 0, absent: 0, late: 0, leave: 0, emergency: 0,
    half_day: 0, unmarked: 0, unpaid_days: 0, late_minutes: 0,
  };
  for (const raw of statuses) {
    const item = raw && typeof raw === 'object' ? raw : { status: raw };
    const s = item.status || 'present';
    if (s === 'present') stats.present++;
    else if (s === 'late') { stats.late++; stats.late_minutes += Number(item.late_minutes) || 0; }
    else if (s === 'absent') { stats.absent++; stats.unpaid_days += 0.5; }
    else if (isLeave(s)) stats.leave++;
    else if (s === 'emergency') stats.emergency++;
    else if (s === 'half_day') { stats.half_day++; stats.unpaid_days += 0.5; }
    else stats.present++;
  }
  const marked = statuses.length;
  stats.marked = marked;
  stats.attendance_rate = marked > 0 ? round2(((stats.present + stats.late + stats.leave + stats.emergency) / marked) * 100) : 0;
  stats.unpaid_days = round2(stats.unpaid_days);
  return stats;
}
const SESSIONS = ['am', 'pm'];

function buildStaffQuery(tenantId, { role, search } = {}) {
  let q = knex('users')
    .where('tenant_id', tenantId)
    .whereIn('role', STAFF_ROLES)
    .where('status', 'active')
    .select('id', 'first_name', 'last_name', 'role', 'email', 'job_title', 'phone');
  if (role) q = q.where('role', role);
  if (search) {
    const { phoneDigits } = require('../../shared/search');
    const term = `%${String(search).trim()}%`;
    const digits = phoneDigits(search);
    q = q.where((b) => {
      b.whereILike('first_name', term)
        .orWhereILike('last_name', term)
        .orWhereILike('email', term)
        .orWhereILike('job_title', term)
        .orWhereILike('role', term)
        .orWhereILike('phone', term);
      if (digits) b.orWhereRaw("regexp_replace(coalesce(phone, ''), '\\D', '', 'g') LIKE ?", [`%${digits}%`]);
    });
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
      knex.raw("CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) as staff_name"),
      'u.role',
      'u.email',
      knex.raw("CONCAT_WS(' ', rec.first_name, rec.middle_name, rec.last_name) as recorded_by_name")
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
    const { phoneDigits } = require('../../shared/search');
    const term = `%${String(search).trim()}%`;
    const digits = phoneDigits(search);
    query = query.where((b) => {
      b.whereILike('u.first_name', term)
        .orWhereILike('u.last_name', term)
        .orWhereILike('u.email', term)
        .orWhereILike('u.job_title', term)
        .orWhereILike('u.role', term)
        .orWhereILike('u.phone', term);
      if (digits) b.orWhereRaw("regexp_replace(coalesce(u.phone, ''), '\\D', '', 'g') LIKE ?", [`%${digits}%`]);
    });
  }

  return await query;
}

async function upsertAttendance(tenantId, recordedBy, { staffId, date, session = 'am', status, checkIn, checkOut, notes, lateMinutes }) {
  const existing = await knex('staff_attendance')
    .where({ tenant_id: tenantId, staff_id: staffId, date, session })
    .first();

  if (existing) {
    const [updated] = await knex('staff_attendance')
      .where({ id: existing.id })
      .update({
        status,
        check_in: checkIn || null,
        check_out: checkOut || null,
        notes: notes || null,
        late_minutes: Number(lateMinutes) || 0,
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
      session,
      status: status || 'present',
      check_in: checkIn || null,
      check_out: checkOut || null,
      notes: notes || null,
      late_minutes: Number(lateMinutes) || 0,
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
      session: item.session,
      status: item.status,
      lateMinutes: item.lateMinutes,
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
      session: e.session,
      status: e.status,
      lateMinutes: e.lateMinutes,
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
      name: `${[s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ')}`,
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
  records.forEach((r) => map.set(`${r.staff_id}|${dateKey(r.date)}|${r.session || 'am'}`, r));
  const recObj = (r) => (r ? { status: r.status, check_in: r.check_in, check_out: r.check_out, notes: r.notes, late_minutes: r.late_minutes || 0 } : { status: null, check_in: null, check_out: null, notes: null, late_minutes: 0 });

  const totals = { present: 0, absent: 0, late: 0, leave: 0, emergency: 0, half_day: 0, unmarked: 0, unpaid_days: 0, late_minutes: 0 };

  const rows = staff.map((s) => {
    const days = dates.map((d) => {
      const am = recObj(map.get(`${s.id}|${d}|am`));
      const pm = recObj(map.get(`${s.id}|${d}|pm`));
      return { date: d, am, pm };
    });
    const statuses = days.flatMap((d) => [d.am, d.pm]);
    const stats = summarizeStatuses(statuses);
    for (const k of Object.keys(totals)) totals[k] += stats[k] || 0;
    return {
      staff_id: s.id,
      name: `${[s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ')}`,
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
    sessions: SESSIONS,
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
      byStaff.set(r.staff_id, { present: 0, absent: 0, late: 0, leave: 0, emergency: 0, half_day: 0, unmarked: 0, unpaid_days: 0, late_minutes: 0 });
    }
    const s = byStaff.get(r.staff_id);
    if (r.status === 'present') s.present++;
    else if (r.status === 'late') { s.late++; s.late_minutes += Number(r.late_minutes) || 0; }
    else if (r.status === 'absent') s.absent++;
    else if (isLeave(r.status)) s.leave++;
    else if (r.status === 'emergency') s.emergency++;
    else if (r.status === 'half_day') s.half_day++;
    s.unpaid_days += unpaidWeight(r.status);
  });

  const totals = { present: 0, absent: 0, late: 0, leave: 0, emergency: 0, half_day: 0, unpaid_days: 0, late_minutes: 0 };
  const rows = filtered.map((s) => {
    const c = byStaff.get(s.id) || { present: 0, absent: 0, late: 0, leave: 0, emergency: 0, half_day: 0, unpaid_days: 0, late_minutes: 0 };
    const marked = c.present + c.absent + c.late + c.leave + c.emergency + c.half_day;
    const result = {
      staff_id: s.id,
      name: `${[s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ')}`,
      role: s.role,
      email: s.email,
      present: c.present,
      absent: c.absent,
      late: c.late,
      leave: c.leave,
      emergency: c.emergency,
      half_day: c.half_day,
      late_minutes: c.late_minutes || 0,
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
    totals.late_minutes += c.late_minutes || 0;
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
    .select('status', 'late_minutes');
  let absent = 0;
  let half = 0;
  let unpaid = 0;
  let lateMinutes = 0;
  for (const r of rows) {
    if (r.status === 'absent') { unpaid += 0.5; absent++; }
    else if (r.status === 'half_day') { unpaid += 0.5; half++; }
    else if (r.status === 'late') { lateMinutes += Number(r.late_minutes) || 0; }
  }
  return { unpaid_days: round2(unpaid), absent_days: absent, half_days: half, late_minutes: lateMinutes };
}

// --- Teacher KPI Metrics ---

async function listTeacherKpis(tenantId, { periodName, teacherId } = {}) {
  let query = knex('teacher_kpi_metrics as kpi')
    .join('users as t', 'kpi.teacher_id', 't.id')
    .leftJoin('users as eval', 'kpi.evaluated_by', 'eval.id')
    .where('kpi.tenant_id', tenantId)
    .select(
      'kpi.*',
      knex.raw("CONCAT_WS(' ', t.first_name, t.middle_name, t.last_name) as teacher_name"),
      't.email as teacher_email',
      knex.raw("CONCAT_WS(' ', eval.first_name, eval.middle_name, eval.last_name) as evaluator_name")
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

async function getHomeroom(tenantId) {
  const classes = await knex('classes')
    .where({ 'classes.tenant_id': tenantId })
    .leftJoin('users as t', 'classes.class_teacher_id', 't.id')
    .select(
      'classes.id', 'classes.name', 'classes.level_group', 'classes.grade_level', 'classes.section',
      'classes.class_teacher_id',
      't.first_name as teacher_first_name', 't.last_name as teacher_last_name'
    )
    .orderByRaw("CASE classes.level_group WHEN 'nursery' THEN 0 WHEN 'kg' THEN 1 WHEN 'primary' THEN 2 WHEN 'secondary' THEN 3 ELSE 4 END")
    .orderBy('classes.grade_level')
    .orderBy('classes.name');
  const teachers = await knex('users')
    .where({ tenant_id: tenantId, status: 'active' })
    .whereIn('role', ['teacher', 'principal', 'vice_principal', 'quality_director'])
    .select('id', 'first_name', 'last_name')
    .orderBy('first_name');
  return { classes, teachers };
}

async function setHomeroom(tenantId, classId, teacherId) {
  if (teacherId) {
    const t = await knex('users').where({ tenant_id: tenantId, id: teacherId, status: 'active' }).first();
    if (!t) { const e = new Error('USER_NOT_FOUND'); e.code = 'USER_NOT_FOUND'; throw e; }
  }
  const [cls] = await knex('classes')
    .where({ tenant_id: tenantId, id: classId })
    .update({ class_teacher_id: teacherId || null, updated_at: knex.fn.now() })
    .returning('*');
  return cls;
}

// --- Overtime ---

const OVERTIME_SETTINGS_KEY = 'overtime';

// Formula (adjustable by admin): hourly = basic / working_days / hours_per_day,
// then × multiplier by type. Day window is editable; weekends/rest days and the
// holiday list are used to auto-classify entries when no explicit type is given.
const DEFAULT_OVERTIME_SETTINGS = {
  working_days: 26,
  hours_per_day: 8,
  day_multiplier: 1.5,   // day overtime (working day, within window)
  night_multiplier: 1.75, // night overtime (outside day window)
  rest_day_multiplier: 2, // weekends / rest days
  holiday_multiplier: 2.5, // public holidays
  day_start: '06:00',
  day_end: '22:00',
  holidays: [],
};

function toTime24(value, fallback) {
  const s = String(value || '').slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  return fallback;
}

function classifyOvertime(dateStr, startTime, settings) {
  const d = dateKey(dateStr);
  const holidays = (settings.holidays || []).map((x) => String(x).slice(0, 10));
  if (d && holidays.includes(d)) return 'holiday';
  const dow = new Date(`${d || '2000-01-01'}T00:00:00Z`).getUTCDay();
  if (dow === 0 || dow === 6) return 'rest_day';
  const t = toTime24(startTime, null);
  if (t) {
    const ds = toTime24(settings.day_start, '06:00');
    const de = toTime24(settings.day_end, '22:00');
    if (t >= ds && t <= de) return 'day';
  }
  return 'night';
}

const OT_MULT_KEY = { day: 'day_multiplier', night: 'night_multiplier', rest_day: 'rest_day_multiplier', holiday: 'holiday_multiplier' };

function computeOvertimePay(hours, type, settings, basicSalary) {
  const h = Number(hours) || 0;
  const basic = Number(basicSalary) || 0;
  const hourly = basic > 0 ? round2(basic / (Number(settings.working_days) || 26) / (Number(settings.hours_per_day) || 8)) : 0;
  const multiplier = Number(settings[OT_MULT_KEY[type]] != null ? settings[OT_MULT_KEY[type]] : settings.day_multiplier) || 1.5;
  const amount = round2(h * hourly * multiplier);
  return { hourly_rate: hourly, multiplier, amount };
}

async function getOvertimeSettings(tenantId) {
  const stored = await settingsService.getByKey(tenantId, OVERTIME_SETTINGS_KEY);
  return { ...DEFAULT_OVERTIME_SETTINGS, ...(stored || {}), holidays: (stored?.holidays || DEFAULT_OVERTIME_SETTINGS.holidays) || [] };
}

async function updateOvertimeSettings(tenantId, data = {}) {
  const current = await getOvertimeSettings(tenantId);
  const pick = (k, d) => (data[k] !== undefined && data[k] !== null && data[k] !== '' ? Number(data[k]) : d);
  const next = {
    working_days: pick('working_days', current.working_days),
    hours_per_day: pick('hours_per_day', current.hours_per_day),
    day_multiplier: pick('day_multiplier', current.day_multiplier),
    night_multiplier: pick('night_multiplier', current.night_multiplier),
    rest_day_multiplier: pick('rest_day_multiplier', current.rest_day_multiplier),
    holiday_multiplier: pick('holiday_multiplier', current.holiday_multiplier),
    day_start: data.day_start != null && data.day_start !== '' ? String(data.day_start).slice(0, 5) : current.day_start,
    day_end: data.day_end != null && data.day_end !== '' ? String(data.day_end).slice(0, 5) : current.day_end,
    holidays: Array.isArray(data.holidays) ? data.holidays.map((x) => String(x).slice(0, 10)).filter(Boolean) : current.holidays,
  };
  await settingsService.set(tenantId, OVERTIME_SETTINGS_KEY, next);
  return next;
}

async function listOvertime(tenantId, { from, to, staffId, status, month, search } = {}) {
  let query = knex('staff_overtime as ot')
    .join('users as u', 'ot.staff_id', 'u.id')
    .where('ot.tenant_id', tenantId)
    .select(
      'ot.*',
      knex.raw("CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) as staff_name"),
      'u.role', 'u.email', 'u.job_title',
      knex.raw("(SELECT CONCAT_WS(' ', ab.first_name, ab.middle_name, ab.last_name) FROM users ab WHERE ab.id = ot.approved_by) as approved_by_name")
    )
    .orderBy('ot.date', 'desc')
    .orderBy('u.first_name');

  if (from) query = query.where('ot.date', '>=', from);
  if (to) query = query.where('ot.date', '<=', to);
  if (month) query = query.whereRaw("TO_CHAR(ot.date, 'YYYY-MM') = ?", [month]);
  if (staffId) query = query.where('ot.staff_id', staffId);
  if (status) query = query.where('ot.status', status);
  if (search) {
    const term = `%${String(search).trim()}%`;
    query = query.where((b) => {
      b.whereILike('u.first_name', term).orWhereILike('u.last_name', term).orWhereILike('u.email', term).orWhereILike('u.job_title', term);
    });
  }
  return await query;
}

async function createOvertime(tenantId, data, performedBy) {
  const staff = await knex('users').where({ tenant_id: tenantId, id: data.staffId }).first();
  if (!staff) { const e = new Error('STAFF_NOT_FOUND'); e.code = 'STAFF_NOT_FOUND'; throw e; }
  const settings = await getOvertimeSettings(tenantId);
  const type = ['day', 'night', 'rest_day', 'holiday'].includes(data.overtimeType) ? data.overtimeType : classifyOvertime(data.date, data.startTime, settings);
  const { hourly_rate, multiplier, amount } = computeOvertimePay(data.hours, type, settings, staff.basic_salary);
  const [inserted] = await knex('staff_overtime').insert({
    tenant_id: tenantId,
    staff_id: data.staffId,
    date: data.date,
    hours: Number(data.hours) || 0,
    overtime_type: type,
    multiplier,
    hourly_rate,
    amount,
    status: data.status === 'approved' ? 'approved' : 'pending',
    notes: data.notes || null,
    approved_by: data.status === 'approved' ? performedBy : null,
  }).returning('*');
  return inserted;
}

async function bulkCreateOvertime(tenantId, entries, performedBy) {
  const results = [];
  for (const e of entries || []) results.push(await createOvertime(tenantId, e, performedBy));
  return results;
}

async function updateOvertime(tenantId, id, data, performedBy) {
  const existing = await knex('staff_overtime').where({ tenant_id: tenantId, id }).first();
  if (!existing) return undefined;
  const staff = await knex('users').where({ tenant_id: tenantId, id: data.staffId || existing.staff_id }).first();
  const settings = await getOvertimeSettings(tenantId);
  const hours = data.hours != null ? Number(data.hours) : Number(existing.hours);
  const type = ['day', 'night', 'rest_day', 'holiday'].includes(data.overtimeType) ? data.overtimeType : existing.overtime_type;
  const { hourly_rate, multiplier, amount } = computeOvertimePay(hours, type, settings, staff?.basic_salary);
  const [updated] = await knex('staff_overtime')
    .where({ tenant_id: tenantId, id })
    .update({
      staff_id: data.staffId || existing.staff_id,
      date: data.date || existing.date,
      hours,
      overtime_type: type,
      multiplier,
      hourly_rate,
      amount,
      notes: data.notes !== undefined ? (data.notes || null) : existing.notes,
      status: data.status === 'approved' ? 'approved' : existing.status,
      approved_by: data.status === 'approved' ? performedBy : existing.approved_by,
      updated_at: knex.fn.now(),
    })
    .returning('*');
  return updated;
}

async function approveOvertime(tenantId, id, approvedBy) {
  const [row] = await knex('staff_overtime')
    .where({ tenant_id: tenantId, id })
    .update({ status: 'approved', approved_by: approvedBy, updated_at: knex.fn.now() })
    .returning('*');
  return row;
}

async function deleteOvertime(tenantId, id) {
  return knex('staff_overtime').where({ tenant_id: tenantId, id }).del();
}

async function getOvertimeSummary(tenantId, { month } = {}) {
  let q = knex('staff_overtime').where({ tenant_id: tenantId });
  if (month) q = q.whereRaw("TO_CHAR(date, 'YYYY-MM') = ?", [month]);
  const byType = await q.clone().groupBy('overtime_type').select('overtime_type').count('* as entries').sum('hours as hours').sum('amount as amount');
  const byStaff = await q.clone().groupBy('staff_id').select('staff_id')
    .sum('hours as hours').sum('amount as amount')
    .orderByRaw('SUM(amount) DESC');
  // Join staff names
  const staffIds = byStaff.map((s) => s.staff_id);
  const staff = staffIds.length ? await knex('users').whereIn('id', staffIds).select('id', 'first_name', 'last_name', 'role') : [];
  const staffMap = new Map(staff.map((s) => [s.id, s]));
  const pending = await q.clone().where('status', 'pending').sum('amount as amount').count('* as entries').first();
  const approved = await q.clone().where('status', 'approved').sum('amount as amount').count('* as entries').first();
  return {
    by_type: byType.map((r) => ({ type: r.overtime_type, entries: Number(r.entries), hours: round2(Number(r.hours)), amount: round2(Number(r.amount)) })),
    by_staff: byStaff.map((r) => {
      const s = staffMap.get(r.staff_id);
      return { staff_id: r.staff_id, name: s ? `${[s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ')}` : '—', role: s?.role || '', hours: round2(Number(r.hours)), amount: round2(Number(r.amount)) };
    }),
    pending: { entries: Number(pending?.entries || 0), amount: round2(Number(pending?.amount || 0)) },
    approved: { entries: Number(approved?.entries || 0), amount: round2(Number(approved?.amount || 0)) },
  };
}

// Approved overtime amount for a staff member + month (used by payroll prefill).
async function getApprovedOvertimeAmount(tenantId, userId, month, year) {
  try {
    const m = String(month).padStart(2, '0');
    const r = await knex('staff_overtime')
      .where({ tenant_id: tenantId, staff_id: userId, status: 'approved' })
      .whereRaw("TO_CHAR(date, 'YYYY-MM') = ?", [`${year}-${m}`])
      .sum('amount as v').first();
    return round2(Number(r?.v || 0));
  } catch (e) {
    // Never let overtime lookup break payroll creation.
    return 0;
  }
}

module.exports = {
  getHomeroom,
  setHomeroom,
  getOvertimeSettings,
  updateOvertimeSettings,
  listOvertime,
  createOvertime,
  bulkCreateOvertime,
  updateOvertime,
  approveOvertime,
  deleteOvertime,
  getOvertimeSummary,
  getApprovedOvertimeAmount,
  classifyOvertime,
  computeOvertimePay,
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
