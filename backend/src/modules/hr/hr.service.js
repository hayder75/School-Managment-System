const knex = require('../../config/database');

// --- Staff / Teacher Attendance ---

async function listStaffAttendance(tenantId, { date, month, staffId } = {}) {
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
    .orderBy('sa.date', 'desc');

  if (date) {
    query = query.where('sa.date', date);
  }

  if (month) {
    // month format YYYY-MM
    query = query.whereRaw("TO_CHAR(sa.date, 'YYYY-MM') = ?", [month]);
  }

  if (staffId) {
    query = query.where('sa.staff_id', staffId);
  }

  return await query;
}

async function bulkMarkAttendance(tenantId, recordedBy, { date, records }) {
  // records: array of { staffId, status, checkIn, checkOut, notes }
  const results = [];
  for (const item of records) {
    const existing = await knex('staff_attendance')
      .where({ tenant_id: tenantId, staff_id: item.staffId, date })
      .first();

    if (existing) {
      const [updated] = await knex('staff_attendance')
        .where({ id: existing.id })
        .update({
          status: item.status,
          check_in: item.checkIn || null,
          check_out: item.checkOut || null,
          notes: item.notes || null,
          recorded_by: recordedBy,
          updated_at: knex.fn.now(),
        })
        .returning('*');
      results.push(updated);
    } else {
      const [inserted] = await knex('staff_attendance')
        .insert({
          tenant_id: tenantId,
          staff_id: item.staffId,
          date,
          status: item.status || 'present',
          check_in: item.checkIn || null,
          check_out: item.checkOut || null,
          notes: item.notes || null,
          recorded_by: recordedBy,
        })
        .returning('*');
      results.push(inserted);
    }
  }
  return results;
}

async function getStaffAttendanceSummary(tenantId, { date }) {
  const staffList = await knex('users')
    .where('tenant_id', tenantId)
    .whereIn('role', ['teacher', 'hr', 'admin', 'finance', 'cashier'])
    .where('status', 'active')
    .select('id', 'first_name', 'last_name', 'role', 'email');

  const attendanceRecords = await knex('staff_attendance')
    .where({ tenant_id: tenantId, date })
    .select('*');

  const recordMap = new Map();
  attendanceRecords.forEach((r) => recordMap.set(r.staff_id, r));

  const stats = {
    totalStaff: staffList.length,
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
    halfDay: 0,
    unmarked: 0,
  };

  const combined = staffList.map((s) => {
    const rec = recordMap.get(s.id);
    const status = rec ? rec.status : 'unmarked';
    if (status === 'present') stats.present++;
    else if (status === 'late') stats.late++;
    else if (status === 'absent') stats.absent++;
    else if (status === 'on_leave') stats.onLeave++;
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

  if (periodName) {
    query = query.where('kpi.period_name', periodName);
  }

  if (teacherId) {
    query = query.where('kpi.teacher_id', teacherId);
  }

  return await query;
}

async function saveTeacherKpi(tenantId, evaluatedBy, data) {
  const attendanceRate = parseFloat(data.attendanceRate || 100);
  const punctualityRate = parseFloat(data.punctualityRate || 100);
  const substitutionsCovered = parseInt(data.substitutionsCovered || 0, 10);
  const studentFeedbackScore = parseFloat(data.studentFeedbackScore || 4.5);
  const syllabusCompletionRate = parseFloat(data.syllabusCompletionRate || 90);

  // Compute weighted overall rating (scale 1.0 to 5.0)
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

  return {
    totalTeachers: teachers.length,
    averages,
    teachers,
    kpiRecords,
  };
}

module.exports = {
  listStaffAttendance,
  bulkMarkAttendance,
  getStaffAttendanceSummary,
  listTeacherKpis,
  saveTeacherKpi,
  getKpiSummary,
};
