const db = require('../../config/database');
const knex = db;

// ── Admin/Owner Reports ──

async function getStudentEnrollmentReport(tenantId, { academic_year_id } = {}) {
  function baseQuery() {
    let q = db('classes').where({ 'classes.tenant_id': tenantId });
    if (academic_year_id) q = q.where('classes.academic_year_id', academic_year_id);
    return q;
  }

  const byClass = await baseQuery()
    .select('classes.id', 'classes.name', 'classes.grade_level')
    .leftJoin('students', 'classes.id', 'students.class_id')
    .groupBy('classes.id', 'classes.name', 'classes.grade_level')
    .count('students.id as student_count')
    .orderBy('classes.grade_level');

  const totalEnrolled = byClass.reduce((sum, c) => sum + parseInt(c.student_count || 0, 10), 0);

  const levelRows = await baseQuery()
    .select('classes.level_group', 'classes.grade_level')
    .leftJoin('students', 'classes.id', 'students.class_id')
    .groupBy('classes.level_group', 'classes.grade_level')
    .count('students.id as student_count')
    .orderBy('classes.grade_level');

  const levelBreakdown = levelRows.map((r) => {
    let label;
    if (r.level_group === 'nursery') label = 'Nursery';
    else if (r.level_group === 'kg') label = r.grade_level === 2 ? 'UKG' : 'LKG';
    else label = `Grade ${r.grade_level}`;
    return { level_group: r.level_group, label, count: parseInt(r.student_count || 0, 10) };
  });

  const genderRows = await db('students')
    .where({ tenant_id: tenantId })
    .select('gender')
    .count('* as count')
    .groupBy('gender');

  const genderBreakdown = genderRows.map((r) => ({
    gender: r.gender || 'unknown',
    count: parseInt(r.count, 10),
  }));

  return { by_class: byClass, level_breakdown: levelBreakdown, gender_breakdown: genderBreakdown, total_enrolled: totalEnrolled };
}

async function getGradeDistributionReport(tenantId, { class_id, exam_id } = {}) {
  let query = db('grades')
    .where({ 'grades.tenant_id': tenantId })
    .leftJoin('exams', 'grades.exam_id', 'exams.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select('grades.grade_letter', db.raw('COUNT(*)::int as count'))
    .groupBy('grades.grade_letter')
    .orderBy('grades.grade_letter');

  if (class_id) {
    if (Array.isArray(class_id)) query = query.whereIn('exams.class_id', class_id);
    else query = query.where('exams.class_id', class_id);
  }
  if (exam_id) query = query.where('grades.exam_id', exam_id);

  const distribution = await query;
  return { distribution };
}

async function getClassPerformanceReport(tenantId, { class_id } = {}) {
  let query = db('grades')
    .where({ 'grades.tenant_id': tenantId })
    .leftJoin('exams', 'grades.exam_id', 'exams.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .leftJoin('classes', 'exams.class_id', 'classes.id')
    .select(
      'classes.name as class_name',
      'subjects.name as subject_name',
      db.raw('ROUND(AVG(grades.marks_obtained), 1) as avg_marks'),
      db.raw('ROUND(MAX(grades.marks_obtained), 1) as max_marks'),
      db.raw('ROUND(MIN(grades.marks_obtained), 1) as min_marks'),
      db.raw('COUNT(*)::int as student_count')
    )
    .groupBy('classes.name', 'subjects.name')
    .orderBy('classes.name', 'subjects.name');

  if (class_id) query = query.where('exams.class_id', class_id);

  return { performance: await query };
}

async function getAttendanceOverviewReport(tenantId, { from_date, to_date, class_id } = {}) {
  let query = db('attendance')
    .where({ 'attendance.tenant_id': tenantId })
    .leftJoin('classes', 'attendance.class_id', 'classes.id')
    .select(
      'classes.name as class_name',
      db.raw("COUNT(*)::int as total"),
      db.raw("SUM(CASE WHEN attendance.status = 'present' THEN 1 ELSE 0 END)::int as present"),
      db.raw("SUM(CASE WHEN attendance.status = 'absent' THEN 1 ELSE 0 END)::int as absent"),
      db.raw("SUM(CASE WHEN attendance.status = 'late' THEN 1 ELSE 0 END)::int as late"),
      db.raw("SUM(CASE WHEN attendance.status = 'excused' THEN 1 ELSE 0 END)::int as excused")
    )
    .groupBy('classes.name')
    .orderBy('classes.name');

  if (class_id) query = query.where('attendance.class_id', class_id);
  if (from_date) query = query.where('attendance.date', '>=', from_date);
  if (to_date) query = query.where('attendance.date', '<=', to_date);

  const overview = await query;

  const summary = overview.reduce((acc, row) => ({
    total: acc.total + row.total,
    present: acc.present + row.present,
    absent: acc.absent + row.absent,
    late: acc.late + row.late,
    excused: acc.excused + row.excused,
  }), { total: 0, present: 0, absent: 0, late: 0, excused: 0 });

  return { by_class: overview, summary };
}

async function getTeacherWorkloadReport(tenantId) {
  const workload = await db('teacher_subjects')
    .where({ 'teacher_subjects.tenant_id': tenantId })
    .leftJoin('users', 'teacher_subjects.teacher_id', 'users.id')
    .leftJoin('subjects', 'teacher_subjects.subject_id', 'subjects.id')
    .leftJoin('classes', 'teacher_subjects.class_id', 'classes.id')
    .select(
      'users.id as teacher_id',
      'users.first_name',
      'users.last_name',
      'users.email',
      db.raw('COUNT(*)::int as total_assignments'),
      db.raw("json_agg(json_build_object('subject', subjects.name, 'class', classes.name)) as assignments")
    )
    .groupBy('users.id', 'users.first_name', 'users.last_name', 'users.email')
    .orderBy('users.last_name');

  return { workload };
}

// ── Teacher Reports ──

async function getTeacherClassStudents(tenantId, teacherId, classId) {
  let query = db('users')
    .where({ 'users.tenant_id': tenantId })
    .join('students', 'users.id', 'students.user_id')
    .select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'students.student_number')
    .orderBy('users.last_name');

  if (classId) {
    query = query.where('students.class_id', classId);
  } else {
    query = query.whereIn('students.class_id', db('teacher_subjects')
      .where({ tenant_id: tenantId, teacher_id: teacherId })
      .select('class_id'));
  }

  return { students: await query };
}

async function getTeacherClassSummary(tenantId, teacherId) {
  const rows = await db('teacher_subjects')
    .where({ 'teacher_subjects.tenant_id': tenantId, 'teacher_subjects.teacher_id': teacherId })
    .leftJoin('classes', 'classes.id', 'teacher_subjects.class_id')
    .leftJoin('subjects', 'subjects.id', 'teacher_subjects.subject_id')
    .leftJoin('students', 'students.class_id', 'teacher_subjects.class_id')
    .select(
      'classes.id as class_id',
      'classes.name as class_name',
      'classes.grade_level',
      'classes.section',
      db.raw('json_agg(DISTINCT subjects.name) filter (where subjects.name is not null) as subjects'),
      db.raw('COUNT(DISTINCT students.id)::int as student_count')
    )
    .groupBy('classes.id', 'classes.name', 'classes.grade_level', 'classes.section')
    .orderBy('classes.grade_level', 'classes.section');

  const summary = {
    totalClasses: rows.length,
    totalStudents: rows.reduce((s, r) => s + (Number(r.student_count) || 0), 0),
    subjects: [...new Set(rows.flatMap((r) => (r.subjects || []).filter(Boolean)))],
    byClass: rows.map((r) => ({
      class_id: r.class_id,
      class_name: r.class_name,
      grade_level: r.grade_level,
      section: r.section,
      students: Number(r.student_count) || 0,
      subjects: r.subjects || [],
    })),
  };
  return summary;
}

async function getTeacherAttendanceReport(tenantId, teacherId, { from_date, to_date } = {}) {
  let query = db('attendance')
    .where({ 'attendance.tenant_id': tenantId, 'attendance.marked_by': teacherId })
    .leftJoin('classes', 'attendance.class_id', 'classes.id')
    .select(
      'classes.name as class_name',
      'attendance.date',
      db.raw("COUNT(*)::int as total"),
      db.raw("SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::int as present"),
      db.raw("SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END)::int as absent")
    )
    .groupBy('classes.name', 'attendance.date')
    .orderBy('attendance.date', 'desc');

  if (from_date) query = query.where('attendance.date', '>=', from_date);
  if (to_date) query = query.where('attendance.date', '<=', to_date);

  return { records: await query };
}

async function getTeacherGradeReport(tenantId, teacherId, { exam_id } = {}) {
  let query = db('grades')
    .where({ 'grades.tenant_id': tenantId })
    .leftJoin('exams', 'grades.exam_id', 'exams.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .leftJoin('users', 'grades.student_id', 'users.id')
    .whereIn('exams.class_id', db('teacher_subjects')
      .where({ tenant_id: tenantId, teacher_id: teacherId })
      .select('class_id'))
    .whereIn('exams.subject_id', db('teacher_subjects')
      .where({ tenant_id: tenantId, teacher_id: teacherId })
      .select('subject_id'))
    .select(
      'exams.name as exam_name',
      'subjects.name as subject_name',
      'users.first_name',
      'users.last_name',
      'grades.marks_obtained',
      'grades.grade_letter'
    )
    .orderBy('exams.name', 'users.last_name');

  if (exam_id) query = query.where('grades.exam_id', exam_id);

  return { grades: await query };
}

// ── Finance Reports ──

async function getFeeCollectionReport(tenantId, { from_date, to_date, class_id } = {}) {
  let query = db('payments')
    .where({ 'payments.tenant_id': tenantId })
    .leftJoin('users', 'payments.student_id', 'users.id')
    .leftJoin('students', 'users.id', 'students.user_id')
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select(
      'classes.name as class_name',
      'payments.payment_method',
      db.raw('SUM(payments.amount_paid)::decimal(12,2) as total'),
      db.raw('COUNT(*)::int as transaction_count')
    )
    .groupBy('classes.name', 'payments.payment_method')
    .orderBy('classes.name');

  if (class_id) query = query.where('students.class_id', class_id);
  if (from_date) query = query.where('payments.paid_date', '>=', from_date);
  if (to_date) query = query.where('payments.paid_date', '<=', to_date);

  return { collection: await query };
}

async function getOutstandingBalanceReport(tenantId, { class_id } = {}) {
  let query = db('payments')
    .where({ 'payments.tenant_id': tenantId })
    .whereIn('payments.status', ['pending', 'partial', 'overdue'])
    .leftJoin('users', 'payments.student_id', 'users.id')
    .leftJoin('students', 'users.id', 'students.user_id')
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select(
      'users.first_name',
      'users.last_name',
      'classes.name as class_name',
      db.raw("SUM(payments.balance)::decimal(12,2) as total_balance")
    )
    .groupBy('users.first_name', 'users.last_name', 'classes.name')
    .orderByRaw('total_balance DESC');

  if (class_id) query = query.where('students.class_id', class_id);

  const students = await query;
  const totalOutstanding = students.reduce((sum, s) => sum + parseFloat(s.total_balance || 0), 0);

  return { students, total_outstanding: totalOutstanding };
}

async function getRevenueVsExpensesReport(tenantId, { year } = {}) {
  const targetYear = year || new Date().getFullYear();

  const revenue = await db('payments')
    .where({ tenant_id: tenantId })
    .whereRaw("EXTRACT(YEAR FROM paid_date) = ?", [targetYear])
    .select(db.raw("EXTRACT(MONTH FROM paid_date)::int as month"))
    .sum('amount_paid as total')
    .groupByRaw("EXTRACT(MONTH FROM paid_date)")
    .orderByRaw("month");

  const expenses = await db('expenses')
    .where({ tenant_id: tenantId })
    .whereRaw("EXTRACT(YEAR FROM expense_date) = ?", [targetYear])
    .select(db.raw("EXTRACT(MONTH FROM expense_date)::int as month"))
    .sum('amount as total')
    .groupByRaw("EXTRACT(MONTH FROM expense_date)")
    .orderByRaw("month");

  const months = Array.from({ length: 12 }, (_, i) => {
    const rev = revenue.find((r) => r.month === i + 1);
    const exp = expenses.find((e) => e.month === i + 1);
    return {
      month: i + 1,
      month_name: new Date(2000, i).toLocaleString('default', { month: 'short' }),
      revenue: parseFloat(rev?.total || 0),
      expenses: parseFloat(exp?.total || 0),
    };
  });

  const totalRevenue = months.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = months.reduce((s, m) => s + m.expenses, 0);

  return { months, total_revenue: totalRevenue, total_expenses: totalExpenses, net: totalRevenue - totalExpenses };
}

// ── HR Reports ──

async function getStaffDirectoryReport(tenantId, { role, status } = {}) {
  let query = db('users')
    .where({ 'users.tenant_id': tenantId })
    .whereNot('users.role', 'student')
    .whereNot('users.role', 'parent')
    .select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.phone', 'users.role', 'users.status')
    .orderBy('users.role')
    .orderBy('users.last_name');

  if (role) query = query.where('users.role', role);
  if (status) query = query.where('users.status', status);

  const staff = await query;

  const byRole = staff.reduce((acc, s) => {
    acc[s.role] = (acc[s.role] || 0) + 1;
    return acc;
  }, {});

  return { staff, total: staff.length, by_role: byRole };
}

async function getPayrollSummaryReport(tenantId, { year } = {}) {
  const targetYear = year || new Date().getFullYear();

  const monthly = await db('payroll')
    .where({ tenant_id: tenantId, year: targetYear })
    .select('month')
    .sum('basic_pay as total_basic')
    .sum('allowances_total as total_allowances')
    .sum('deductions_total as total_deductions')
    .sum('net_pay as total_net')
    .count('* as employee_count')
    .groupBy('month')
    .orderBy('month');

  const yearly = await db('payroll')
    .where({ tenant_id: tenantId, year: targetYear })
    .sum('net_pay as total')
    .first();

  return { monthly, yearly_total: parseFloat(yearly?.total || 0), year: targetYear };
}

async function getHeadcountReport(tenantId) {
  const byRole = await db('users')
    .where({ tenant_id: tenantId })
    .select('role')
    .count('* as count')
    .groupBy('role')
    .orderBy('role');

  return { by_role: byRole, total: byRole.reduce((s, r) => s + parseInt(r.count, 10), 0) };
}

// ── Student Reports ──

function percentageToGpa(pct) {
  if (pct == null) return null;
  if (pct >= 90) return 4.0;
  if (pct >= 80) return 3.0;
  if (pct >= 70) return 2.0;
  if (pct >= 60) return 1.0;
  return 0.0;
}

async function getStudentGradeSummary(tenantId, studentId, subjectIds) {
  let query = db('grades')
    .where({ 'grades.tenant_id': tenantId, 'grades.student_id': studentId })
    .leftJoin('exams', 'grades.exam_id', 'exams.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select(
      'subjects.name as subject_name',
      db.raw('COALESCE(SUM(grades.marks_obtained), 0) as obtained'),
      db.raw('COALESCE(SUM(exams.total_marks), 0) as possible'),
      db.raw('COUNT(*)::int as exam_count')
    )
    .groupBy('subjects.name')
    .orderBy('subjects.name');

  if (Array.isArray(subjectIds)) {
    query = query.whereIn('exams.subject_id', subjectIds);
  }

  const rows = await query;

  let obtainedTotal = 0;
  let possibleTotal = 0;
  const by_subject = rows.map((r) => {
    const obtained = parseFloat(r.obtained);
    const possible = parseFloat(r.possible);
    obtainedTotal += obtained;
    possibleTotal += possible;
    return {
      subject_name: r.subject_name,
      exam_count: r.exam_count,
      average: possible > 0 ? parseFloat(((obtained / possible) * 100).toFixed(1)) : null,
    };
  });

  const overall_average = possibleTotal > 0
    ? parseFloat(((obtainedTotal / possibleTotal) * 100).toFixed(1))
    : null;

  return {
    by_subject,
    overall_average,
    gpa: percentageToGpa(overall_average),
    total_exams: by_subject.reduce((sum, s) => sum + s.exam_count, 0),
  };
}

async function getStudentAttendanceSummary(tenantId, studentId, { term_id } = {}) {
  let query = db('attendance')
    .where({ tenant_id: tenantId, student_id: studentId });

  if (term_id) {
    const term = await db('terms').where({ id: term_id }).first();
    if (term) {
      query = query.where('date', '>=', term.start_date).where('date', '<=', term.end_date);
    }
  }

  const records = await query
    .select('status')
    .count('* as count')
    .groupBy('status');

  const total = records.reduce((s, r) => s + parseInt(r.count, 10), 0);
  const present = records.find((r) => r.status === 'present')?.count || 0;

  return {
    records,
    total,
    present_percentage: total > 0 ? ((parseInt(present, 10) / total) * 100).toFixed(1) : null,
  };
}

// ── Legacy / generic ──

async function getStudentReport(tenantId, studentId, subjectIds) {
  const student = await db('users')
    .where({ 'users.id': studentId, 'users.tenant_id': tenantId })
    .select(
      'users.id', 'users.email', 'users.first_name', 'users.last_name',
      'users.phone', 'users.avatar', 'users.role', 'users.status'
    )
    .first();
  if (!student) return null;

  const [attendance, grades, payments] = await Promise.all([
    getStudentAttendanceSummary(tenantId, studentId),
    getStudentGradeSummary(tenantId, studentId, subjectIds),
    db('payments').where({ tenant_id: tenantId, student_id: studentId }).sum('amount_paid as total_paid').first(),
  ]);

  return { student, attendance, grades, total_paid: parseFloat(payments?.total_paid || 0) };
}

async function getClassReport(tenantId, classId) {
  const classInfo = await db('classes').where({ tenant_id: tenantId, id: classId }).first();
  if (!classInfo) return null;

  const studentCount = await db('users')
    .join('students', 'users.id', 'students.user_id')
    .where({ 'students.tenant_id': tenantId, 'students.class_id': classId })
    .count('* as count')
    .first();

  const averageMarks = await db('grades')
    .where({ 'grades.tenant_id': tenantId })
    .join('students', 'grades.student_id', 'students.user_id')
    .where('students.class_id', classId)
    .avg('marks_obtained as avg')
    .first();

  return { class: classInfo, student_count: parseInt(studentCount?.count || 0, 10), average_marks: parseFloat(averageMarks?.avg || 0) };
}

async function getFeeReport(tenantId, { from_date, to_date } = {}) {
  return getFeeCollectionReport(tenantId, { from_date, to_date });
}


async function getSemesterResults(tenantId, { term_id, class_id } = {}) {
  if (!term_id) {
    const err = new Error('TERM_REQUIRED');
    err.code = 'TERM_REQUIRED';
    throw err;
  }

  const grading = require('../../shared/grading');
  const { scale, weights } = await grading.getGradingConfig(tenantId);

  let exams = db('exams')
    .where({ tenant_id: tenantId, term_id })
    .select('id', 'name', 'class_id', 'subject_id', 'type', 'total_marks', 'pass_marks');
  if (class_id) exams = exams.where('class_id', class_id);
  exams = await exams;
  if (!exams.length) return { scale, weights, subjects: [], students: [] };

  const subjectRowsDb = await db('subjects').where('tenant_id', tenantId).select('id', 'name');
  const subjectNames = Object.fromEntries(subjectRowsDb.map((s) => [s.id, s.name]));
  void subjectNames;

  const examIds = exams.map((e) => e.id);
  const gradeRows = await db('grades as g')
    .join('users as su', 'g.student_id', 'su.id')
    .join('students as s', 's.user_id', 'su.id')
    .whereIn('g.exam_id', examIds)
    .where('g.tenant_id', tenantId)
    .select(
      'g.exam_id', 'g.marks_obtained', 'su.id as student_id',
      knex.raw("CONCAT(su.first_name, ' ', su.last_name) as student_name"),
      's.student_number'
    );

  const examById = Object.fromEntries(exams.map((e) => [e.id, e]));

  // student → subject → buckets
  const byStudent = {};
  for (const row of gradeRows) {
    const exam = examById[row.exam_id];
    if (!exam || row.marks_obtained == null) continue;
    const subjectKey = exam.subject_id || `cls-${exam.class_id}`;
    const bucket = grading.isFinalExamType(exam.type) ? 'final' : 'ca';

    byStudent[row.student_id] = byStudent[row.student_id] || {
      student_id: row.student_id,
      student_name: row.student_name,
      student_number: row.student_number,
      class_id: exam.class_id,
      subjects: {},
    };
    const st = byStudent[row.student_id];
    st.subjects[subjectKey] = st.subjects[subjectKey] || { subject_id: exam.subject_id, ca: [], final: [] };
    st.subjects[subjectKey][bucket].push({
      marks: Number(row.marks_obtained),
      total: Number(exam.total_marks || 100),
    });
  }

  // compute weighted semester mark per subject
  const results = [];
  for (const student of Object.values(byStudent)) {
    if (class_id && student.class_id !== class_id) continue;
    const subjectRows = [];
    let totalMark = 0;
    for (const [, subj] of Object.entries(student.subjects)) {
      const avgPct = (arr) => arr.length
        ? arr.reduce((a, x) => a + (x.marks / (x.total || 100)) * 100, 0) / arr.length
        : null;
      const caPct = avgPct(subj.ca);
      const examPct = avgPct(subj.final);
      let mark;
      if (caPct != null && examPct != null) {
        mark = (caPct * weights.ca_pct + examPct * weights.exam_pct) / 100;
      } else {
        mark = caPct != null ? caPct : examPct;
      }
      if (mark == null) continue;
      const rounded = Math.round(mark * 10) / 10;
      subjectRows.push({
        subject_id: subj.subject_id,
        name: (subj.subject_id && subjectNames[subj.subject_id]) || 'Subject',
        ca: caPct != null ? Math.round(caPct * 10) / 10 : null,
        exam: examPct != null ? Math.round(examPct * 10) / 10 : null,
        mark: rounded,
        letter: grading.letterFor(scale, rounded),
      });
      totalMark += rounded;
    }
    subjectRows.sort((a, b) => (b.mark || 0) - (a.mark || 0));
    const average = subjectRows.length ? Math.round((totalMark / subjectRows.length) * 10) / 10 : 0;
    results.push({
      student_id: student.student_id,
      student_name: student.student_name,
      student_number: student.student_number,
      subjects: subjectRows,
      total: Math.round(totalMark * 10) / 10,
      average,
      letter: grading.letterFor(scale, average),
    });
  }

  results.sort((a, b) => b.average - a.average);
  results.forEach((r, i) => { r.rank = i + 1; });

  return { term_id, class_id: class_id || null, scale, weights, students: results };
}

module.exports = {
  getStudentEnrollmentReport,
  getGradeDistributionReport,
  getClassPerformanceReport,
  getAttendanceOverviewReport,
  getTeacherWorkloadReport,
  getTeacherClassStudents,
  getTeacherClassSummary,
  getTeacherAttendanceReport,
  getTeacherGradeReport,
  getFeeCollectionReport,
  getOutstandingBalanceReport,
  getRevenueVsExpensesReport,
  getStaffDirectoryReport,
  getPayrollSummaryReport,
  getHeadcountReport,
  getStudentGradeSummary,
  getStudentAttendanceSummary,
  getStudentReport,
  getClassReport,
  getFeeReport,
  getSemesterResults,
};
