const db = require('../../config/database');

// ── Admin/Owner Reports ──

async function getStudentEnrollmentReport(tenantId, { academic_year_id } = {}) {
  let query = db('classes').where({ 'classes.tenant_id': tenantId });
  if (academic_year_id) query = query.where('classes.academic_year_id', academic_year_id);

  const byClass = await query.clone()
    .select('classes.id', 'classes.name', 'classes.grade_level')
    .leftJoin('students', 'classes.id', 'students.class_id')
    .groupBy('classes.id', 'classes.name', 'classes.grade_level')
    .count('students.id as student_count')
    .orderBy('classes.grade_level');

  const totalEnrolled = byClass.reduce((sum, c) => sum + parseInt(c.student_count || 0, 10), 0);

  return { by_class: byClass, total_enrolled: totalEnrolled };
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

async function getStudentGradeSummary(tenantId, studentId, subjectIds) {
  let query = db('grades')
    .where({ 'grades.tenant_id': tenantId, 'grades.student_id': studentId })
    .leftJoin('exams', 'grades.exam_id', 'exams.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select(
      'subjects.name as subject_name',
      db.raw('ROUND(AVG(grades.marks_obtained), 1) as average'),
      db.raw('COUNT(*)::int as exam_count')
    )
    .groupBy('subjects.name')
    .orderBy('subjects.name');

  if (Array.isArray(subjectIds)) {
    query = query.whereIn('exams.subject_id', subjectIds);
  }

  const grades = await query;

  const overall = grades.reduce((s, g) => ({ total: s.total + parseFloat(g.average), count: s.count + 1 }), { total: 0, count: 0 });

  return { by_subject: grades, overall_average: overall.count > 0 ? (overall.total / overall.count).toFixed(1) : null };
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

module.exports = {
  getStudentEnrollmentReport,
  getGradeDistributionReport,
  getClassPerformanceReport,
  getAttendanceOverviewReport,
  getTeacherWorkloadReport,
  getTeacherClassStudents,
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
};
