const db = require('../../config/database');
const knex = db;

// ── Admin/Owner Reports ──

async function getStudentEnrollmentReport(tenantId, { academic_year_id, scopes } = {}) {
  function baseQuery() {
    let q = db('classes').where({ 'classes.tenant_id': tenantId });
    if (academic_year_id) q = q.where('classes.academic_year_id', academic_year_id);
    if (scopes && scopes.length) q = q.whereIn('classes.level_group', scopes);
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

  let genderQ = db('students')
    .where({ 'students.tenant_id': tenantId })
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select('students.gender')
    .count('* as count')
    .groupBy('students.gender');
  if (scopes && scopes.length) genderQ = genderQ.whereIn('classes.level_group', scopes);
  const genderRows = await genderQ;

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
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select(
      'users.id',
      'users.first_name',
      'users.middle_name',
      'users.last_name',
      'users.email',
      'students.student_number',
      'students.class_id',
      'classes.name as class_name'
    )
    .orderBy('users.first_name');

  const wanted = Array.isArray(classId) ? classId : (classId ? [classId] : []);
  if (wanted.length) {
    query = query.whereIn('students.class_id', wanted);
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

async function getTeacherAttendanceReport(tenantId, teacherId, { from_date, to_date, class_id } = {}) {
  let query = db('attendance')
    .where({ 'attendance.tenant_id': tenantId, 'attendance.marked_by': teacherId })
    .leftJoin('classes', 'attendance.class_id', 'classes.id')
    .select(
      'classes.id as class_id',
      'classes.name as class_name',
      'attendance.date',
      db.raw("COUNT(*)::int as total"),
      db.raw("SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)::int as present"),
      db.raw("SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END)::int as absent"),
      db.raw("SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END)::int as late"),
      db.raw("SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END)::int as excused")
    )
    .groupBy('classes.id', 'classes.name', 'attendance.date')
    .orderBy('attendance.date', 'desc');

  if (from_date) query = query.where('attendance.date', '>=', from_date);
  if (to_date) query = query.where('attendance.date', '<=', to_date);
  const wanted = Array.isArray(class_id) ? class_id : (class_id ? [class_id] : []);
  if (wanted.length) query = query.whereIn('attendance.class_id', wanted);

  return { records: await query };
}

async function getTeacherGradeReport(tenantId, teacherId, { exam_id, class_id, type } = {}) {
  const pairs = await db('teacher_subjects')
    .where({ tenant_id: tenantId, teacher_id: teacherId })
    .select('class_id', 'subject_id');
  if (!pairs.length) return { grades: [] };

  let query = db('grades')
    .where({ 'grades.tenant_id': tenantId })
    .leftJoin('exams', 'grades.exam_id', 'exams.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .leftJoin('users', 'grades.student_id', 'users.id')
    .leftJoin('classes', 'exams.class_id', 'classes.id')
    // Match the exact (class, subject) pairs this teacher is assigned to. The
    // old version used two independent IN lists, which leaked marks across
    // classes where the teacher taught a different subject.
    .where(function () {
      for (const p of pairs) {
        this.orWhere(function () {
          this.where('exams.subject_id', p.subject_id)
            .andWhere(function () {
              this.where('exams.class_id', p.class_id)
                .orWhereRaw('exams.class_ids @> ?::jsonb', [JSON.stringify([p.class_id])]);
            });
        });
      }
    })
    .select(
      'exams.id as exam_id',
      'exams.name as exam_name',
      'exams.type as exam_type',
      'exams.total_marks',
      'exams.pass_marks',
      'exams.date as exam_date',
      'classes.name as class_name',
      'subjects.name as subject_name',
      'users.id as student_id',
      'users.first_name',
      'users.middle_name',
      'users.last_name',
      'grades.marks_obtained',
      'grades.grade_letter'
    )
    .orderBy('exams.name', 'users.first_name');

  if (exam_id) query = query.where('grades.exam_id', exam_id);
  const wanted = Array.isArray(class_id) ? class_id : (class_id ? [class_id] : []);
  if (wanted.length) {
    query = query.where(function () {
      this.whereIn('exams.class_id', wanted)
        .orWhere(function () {
          for (const cid of wanted) this.orWhereRaw('exams.class_ids @> ?::jsonb', [JSON.stringify([cid])]);
        });
    });
  }
  if (type) {
    const t = String(type).toLowerCase();
    if (['mid', 'midterm'].includes(t)) query = query.whereIn('exams.type', ['midterm', 'mid']);
    else if (['final', 'finals'].includes(t)) query = query.whereIn('exams.type', ['final', 'exam', 'semester']);
    else query = query.where('exams.type', type);
  }

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
    .select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.phone', 'users.role', 'users.status', 'users.job_title', 'users.basic_salary')
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
      knex.raw("CONCAT_WS(' ', su.first_name, su.middle_name, su.last_name) as student_name"),
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

// ── Executive Overview (rich, shareable) ──
async function getOverviewReport(tenantId, { from, to } = {}) {
  const end = to ? new Date(`${to}T00:00:00Z`) : new Date();
  const start = from ? new Date(`${from}T00:00:00Z`) : new Date(end.getTime() - 29 * 864e5);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const s = fmt(start), e = fmt(end);
  const span = end - start + 864e5;
  const prevEnd = new Date(start.getTime() - 864e5);
  const prevStart = new Date(prevEnd.getTime() - span + 864e5);
  const ps = fmt(prevStart), pe = fmt(prevEnd);

  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
  const delta = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : (cur > 0 ? 100 : 0));

  const attendanceRate = async (f, t) => {
    const rows = await db('attendance').where({ tenant_id: tenantId }).whereBetween('date', [f, t])
      .groupBy('status').select('status').count('* as c');
    let present = 0, total = 0;
    for (const r of rows) {
      const c = Number(r.c); total += c;
      const st = String(r.status).toLowerCase();
      if (st === 'present' || st === 'late') present += c;
    }
    return { rate: pct(present, total), total };
  };
  const collected = async (f, t) => {
    const r = await db('payments').where({ tenant_id: tenantId }).whereBetween('paid_date', [f, t]).sum('amount_paid as v').first();
    return Number(r?.v || 0);
  };
  const avgScore = async (f, t) => {
    const r = await db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id')
      .where('ex.tenant_id', tenantId).whereBetween('ex.date', [f, t])
      .whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0)
      .select(db.raw('AVG(g.marks_obtained / ex.total_marks * 100) as v')).first();
    return r?.v != null ? Math.round(Number(r.v) * 10) / 10 : null;
  };

  const [studentsRow, staffRow, outstandingRow, classesRow] = await Promise.all([
    db('students').where({ tenant_id: tenantId, status: 'active' }).count('* as c').first(),
    db('users').where({ tenant_id: tenantId }).whereNotIn('role', ['student', 'parent']).whereNot('status', 'inactive').count('* as c').first(),
    db('student_monthly_bills').where({ tenant_id: tenantId, status: 'unpaid' }).select(db.raw('COALESCE(SUM(amount + penalty - amount_paid), 0) as v')).first(),
    db('classes').where({ tenant_id: tenantId }).count('* as c').first(),
  ]);

  const [attCur, attPrev, colCur, colPrev, scoreCur, scorePrev] = await Promise.all([
    attendanceRate(s, e), attendanceRate(ps, pe), collected(s, e), collected(ps, pe), avgScore(s, e), avgScore(ps, pe),
  ]);

  const [byGrade, attByGrade, collectionTrend, gradeBands, staffByRole] = await Promise.all([
    db('classes').where({ 'classes.tenant_id': tenantId }).leftJoin('students', 'classes.id', 'students.class_id')
      .where(function () { this.whereNull('students.id').orWhere('students.status', 'active'); })
      .groupBy('classes.grade_level').select('classes.grade_level as grade').count('students.id as c').orderBy('classes.grade_level'),
    db('attendance').where({ 'attendance.tenant_id': tenantId }).whereBetween('attendance.date', [s, e])
      .join('students', 'attendance.student_id', 'students.id').join('classes', 'students.class_id', 'classes.id')
      .groupBy('classes.grade_level').select('classes.grade_level as grade')
      .select(db.raw("count(*) filter (where lower(attendance.status) in ('present','late')) as present"))
      .select(db.raw('count(*) as total')).orderBy('classes.grade_level'),
    db('payments').where({ tenant_id: tenantId }).whereBetween('paid_date', [s, e])
      .groupByRaw("to_char(paid_date,'YYYY-MM')").select(db.raw("to_char(paid_date,'YYYY-MM') as month")).sum('amount_paid as v').orderBy('month'),
    db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id')
      .where('ex.tenant_id', tenantId).whereBetween('ex.date', [s, e]).whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0)
      .select(db.raw(`CASE
        WHEN g.marks_obtained/ex.total_marks >= 0.9 THEN 'A (90+)'
        WHEN g.marks_obtained/ex.total_marks >= 0.8 THEN 'B (80-89)'
        WHEN g.marks_obtained/ex.total_marks >= 0.7 THEN 'C (70-79)'
        WHEN g.marks_obtained/ex.total_marks >= 0.6 THEN 'D (60-69)'
        ELSE 'F (<60)' END as band`))
      .count('* as c').groupBy('band'),
    db('users').where({ tenant_id: tenantId }).whereNotIn('role', ['student', 'parent']).whereNot('status', 'inactive')
      .groupBy('role').select('role').count('* as c').orderBy('c', 'desc'),
  ]);

  const insights = [];
  if (attCur.rate > 0 && attCur.rate < 90) insights.push(`Attendance is ${attCur.rate}% — below the 90% target.`);
  if (attCur.rate >= 90) insights.push(`Attendance is healthy at ${attCur.rate}%.`);
  const outstanding = Number(outstandingRow?.v || 0);
  if (outstanding > 0) insights.push(`Outstanding fees total ${Math.round(outstanding).toLocaleString()} ETB.`);
  if (staffRow && Number(studentsRow?.c || 0) > 0) {
    const ratio = Math.round(Number(studentsRow.c) / Number(staffRow.c));
    insights.push(`Student-to-staff ratio is about ${ratio}:1.`);
  }
  if (scoreCur != null) insights.push(`Average exam score is ${scoreCur}%.`);

  return {
    period: { from: s, to: e },
    kpis: {
      students: { value: Number(studentsRow?.c || 0), delta: null, label: 'Active students' },
      attendance_rate: { value: attCur.rate, delta: delta(attCur.rate, attPrev.rate), unit: '%', label: 'Attendance rate' },
      collected: { value: colCur, delta: delta(colCur, colPrev), unit: 'ETB', label: 'Fees collected' },
      outstanding: { value: outstanding, delta: null, unit: 'ETB', label: 'Outstanding fees' },
      avg_score: { value: scoreCur, delta: scoreCur != null && scorePrev != null ? delta(scoreCur, scorePrev) : null, unit: '%', label: 'Average score' },
      staff: { value: Number(staffRow?.c || 0), delta: null, label: 'Staff' },
      classes: { value: Number(classesRow?.c || 0), delta: null, label: 'Classes' },
    },
    enrollment_by_grade: byGrade.map((r) => ({ label: `G${r.grade}`, value: Number(r.c) })),
    attendance_by_grade: attByGrade.map((r) => ({ label: `G${r.grade}`, value: pct(Number(r.present), Number(r.total)) })),
    collection_trend: collectionTrend.map((r) => ({ label: r.month, value: Number(r.v) || 0 })),
    grade_distribution: gradeBands.map((r) => ({ label: r.band, value: Number(r.c) })),
    staff_by_role: staffByRole.map((r) => ({ label: r.role, value: Number(r.c) })),
    insights,
  };
}

// ── Rich class result sheet ──

const gradeSvc = require('../grades/grades.service');

function toArray(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (v === undefined || v === null || v === '') return [];
  return [v];
}

function percent(marks, total) {
  const m = Number(marks);
  const t = Number(total);
  if (!Number.isFinite(m) || !Number.isFinite(t) || t <= 0) return null;
  return Math.round((m / t) * 1000) / 10;
}

/**
 * One rich result sheet for any set of classes.
 *
 * Filters: class_id (one or many), subject_id, type (one or many), term_id,
 * from_date, to_date, exam_id.
 *
 * Returns: exams, students, subjects[] (per-student totals + rank + grade),
 * exam analysis, and per-student overall.
 */
async function getClassResults(tenantId, filters = {}, viewer = {}) {
  const grading = require('../../shared/grading');
  const { scale } = await grading.getGradingConfig(tenantId);
  const scheme = await grading.getScheme(tenantId);
  const passPct = Number(scheme.pass_pct ?? 50);

  let classIds = toArray(filters.class_id ?? filters.class_ids);
  let subjectIds = toArray(filters.subject_id ?? filters.subject_ids);
  const types = toArray(filters.types ?? filters.type);
  const termId = filters.term_id;
  const fromDate = filters.from_date;
  const toDate = filters.to_date;
  const examId = filters.exam_id;

  // Teachers may only see their own classes and their own (class, subject) pairs.
  let pairs = null;
  if (viewer.role === 'teacher') {
    pairs = await db('teacher_subjects')
      .where({ tenant_id: tenantId, teacher_id: viewer.userId })
      .select('class_id', 'subject_id');
    const allowedClasses = [...new Set(pairs.map((p) => p.class_id))];
    if (!classIds.length) classIds = allowedClasses;
    else classIds = classIds.filter((c) => allowedClasses.includes(c));

    if (!subjectIds.length) subjectIds = [...new Set(pairs.map((p) => p.subject_id))];
    else {
      const allowedSubjects = new Set(pairs.map((p) => p.subject_id));
      subjectIds = subjectIds.filter((s) => allowedSubjects.has(s));
    }
  }

  if (!classIds.length) {
    // Non-teachers with no class pick get the whole school.
    const rows = await db('classes').where({ tenant_id: tenantId }).select('id');
    classIds = rows.map((r) => r.id);
  }
  if (!classIds.length) {
    return { exams: [], students: [], subjects: [], exam_analysis: [], overall: [], scheme, pass_pct: passPct, scale };
  }

  let examQuery = db('exams')
    .where({ 'exams.tenant_id': tenantId })
    .whereNull('exams.archived_at')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select(
      'exams.id',
      'exams.name',
      'exams.type',
      'exams.date',
      'exams.total_marks',
      'exams.pass_marks',
      'exams.term_id',
      'exams.class_id',
      'exams.class_ids',
      'exams.subject_id',
      'subjects.name as subject_name'
    )
    .orderBy('exams.date', 'asc');

  if (examId) examQuery = examQuery.where('exams.id', examId);
  if (termId) examQuery = examQuery.where('exams.term_id', termId);
  if (fromDate) examQuery = examQuery.where('exams.date', '>=', fromDate);
  if (toDate) examQuery = examQuery.where('exams.date', '<=', toDate);
  if (types.length) examQuery = examQuery.whereIn('exams.type', types);
  if (subjectIds.length) examQuery = examQuery.whereIn('exams.subject_id', subjectIds);

  examQuery = examQuery.where(function () {
    this.whereIn('exams.class_id', classIds);
    for (const cid of classIds) {
      this.orWhereRaw('exams.class_ids @> ?::jsonb', [JSON.stringify([cid])]);
    }
  });

  let exams = await examQuery;

  if (pairs) {
    const pairSet = new Set(pairs.map((p) => `${p.class_id}:${p.subject_id}`));
    exams = exams.filter((e) => gradeSvc.examClassIds(e).some((cid) => pairSet.has(`${cid}:${e.subject_id}`)));
  }

  const students = await db('students as st')
    .join('users as u', 'st.user_id', 'u.id')
    .leftJoin('classes as c', 'st.class_id', 'c.id')
    .where('st.tenant_id', tenantId)
    .whereIn('st.class_id', classIds)
    .where('st.status', 'active')
    .select(
      'u.id as student_id',
      'u.first_name',
      'u.middle_name',
      'u.last_name',
      'st.student_number',
      'st.class_id',
      'c.name as class_name'
    )
    .orderBy('u.first_name');

  const examIds = exams.map((e) => e.id);
  const gradeRows = examIds.length
    ? await db('grades')
      .where({ tenant_id: tenantId })
      .whereIn('exam_id', examIds)
      .select('exam_id', 'student_id', 'marks_obtained', 'grade_letter')
    : [];

  const marksByStudent = new Map();
  for (const g of gradeRows) {
    if (!marksByStudent.has(g.student_id)) marksByStudent.set(g.student_id, {});
    marksByStudent.get(g.student_id)[g.exam_id] = g;
  }

  // Build per-subject result tables.
  const subjectMap = new Map();
  for (const e of exams) {
    if (!subjectMap.has(e.subject_id)) {
      subjectMap.set(e.subject_id, { subject_id: e.subject_id, subject_name: e.subject_name, exams: [] });
    }
    subjectMap.get(e.subject_id).exams.push(e);
  }

  const subjects = [];
  for (const subj of subjectMap.values()) {
    const subjectExamIds = new Set(subj.exams.map((e) => e.id));
    let subjectTotalMarks = 0;
    for (const e of subj.exams) subjectTotalMarks += Number(e.total_marks || 0);

    const rows = [];
    for (const st of students) {
      // Only students who are in a class this exam targets.
      const relevant = subj.exams.filter((e) => gradeSvc.examClassIds(e).includes(st.class_id));
      if (!relevant.length) continue;

      const marks = marksByStudent.get(st.student_id) || {};
      const perExam = relevant.map((e) => {
        const g = marks[e.id];
        return {
          exam_id: e.id,
          marks: g?.marks_obtained != null ? Number(g.marks_obtained) : null,
          grade_letter: g?.grade_letter || null,
          percent: percent(g?.marks_obtained, e.total_marks),
        };
      });

      const entered = perExam.filter((m) => m.marks != null);
      const rawMarks = entered.reduce((s, m) => s + m.marks, 0);
      const rawTotal = entered.reduce((s, m) => {
        const ex = relevant.find((e) => e.id === m.exam_id);
        return s + Number(ex?.total_marks || 0);
      }, 0);
      let finalPercent = null;
      let breakdown = [];
      if (scheme.mode === 'weighted') {
        const combined = grading.computeWeightedPercent(scheme, relevant.map((e) => ({
          type: e.type,
          total: Number(e.total_marks || 0),
          marks: marks[e.id]?.marks_obtained,
        })));
        finalPercent = combined.percent;
        breakdown = combined.breakdown;
      } else if (rawTotal > 0) {
        finalPercent = Math.round((rawMarks / rawTotal) * 1000) / 10;
      }

      rows.push({
        student_id: st.student_id,
        first_name: st.first_name,
        middle_name: st.middle_name,
        last_name: st.last_name,
        student_number: st.student_number,
        class_id: st.class_id,
        class_name: st.class_name,
        marks: perExam,
        entered: entered.length,
        expected: relevant.length,
        raw_marks: Math.round(rawMarks * 100) / 100,
        raw_total: Math.round(rawTotal * 100) / 100,
        percent: finalPercent,
        grade_letter: finalPercent == null ? null : grading.letterFor(scale, finalPercent),
        passed: finalPercent == null ? null : finalPercent >= passPct,
        breakdown,
      });
    }

    rows.sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));
    let rank = 0;
    let lastPercent = null;
    rows.forEach((r, i) => {
      if (r.percent == null) { r.rank = null; return; }
      if (r.percent !== lastPercent) { rank = i + 1; lastPercent = r.percent; }
      r.rank = rank;
    });

    const averaged = rows.filter((r) => r.percent != null);
    subjects.push({
      subject_id: subj.subject_id,
      subject_name: subj.subject_name,
      exams: subj.exams,
      total_marks: subjectTotalMarks,
      students: rows,
      summary: {
        students: rows.length,
        entered: averaged.length,
        average: averaged.length
          ? Math.round((averaged.reduce((s, r) => s + r.percent, 0) / averaged.length) * 10) / 10
          : null,
        pass_rate: averaged.length
          ? Math.round((averaged.filter((r) => r.passed).length / averaged.length) * 100)
          : null,
      },
    });
  }

  // Per-exam statistics (item/analysis level data needs question-level storage,
  // which the system does not have yet — this is exam-level analysis).
  // ── Per test, per class ──
  // This is the exact list a teacher needs: "Test 1 in Grade 2 A, out of 10 —
  // what did each student get?" One block per (exam × class).
  const examBreakdown = [];
  for (const e of exams) {
    const total = Number(e.total_marks || 0);
    const pass = Number(e.pass_marks || 0);
    const examClasses = gradeSvc.examClassIds(e).filter((cid) => classIds.includes(cid));
    for (const cid of examClasses) {
      const classStudents = students.filter((s) => s.class_id === cid);
      const rows = classStudents.map((st) => {
        const g = marksByStudent.get(st.student_id)?.[e.id];
        const marks = g?.marks_obtained != null ? Number(g.marks_obtained) : null;
        const pct = percent(marks, total);
        return {
          student_id: st.student_id,
          first_name: st.first_name,
          middle_name: st.middle_name,
          last_name: st.last_name,
          student_number: st.student_number,
          marks,
          percent: pct,
          grade_letter: pct == null ? null : grading.letterFor(scale, pct),
          passed: marks == null ? null : marks >= pass,
          exceeded: marks != null && total > 0 && marks > total,
        };
      });
      rows.sort((a, b) => {
        if (a.marks == null && b.marks == null) return 0;
        if (a.marks == null) return 1;
        if (b.marks == null) return -1;
        return b.marks - a.marks;
      });
      let rank = 0;
      let last = null;
      rows.forEach((r, i) => {
        if (r.marks == null) { r.rank = null; return; }
        if (r.marks !== last) { rank = i + 1; last = r.marks; }
        r.rank = rank;
      });

      const values = rows.filter((r) => r.marks != null).map((r) => r.marks);
      const sat = values.length;
      examBreakdown.push({
        exam_id: e.id,
        exam_name: e.name,
        exam_type: e.type,
        date: e.date,
        subject_id: e.subject_id,
        subject_name: e.subject_name,
        class_id: cid,
        class_name: classStudents[0]?.class_name || null,
        total_marks: total,
        pass_marks: pass,
        students: rows,
        stats: {
          total_students: rows.length,
          sat,
          missing: rows.length - sat,
          average: sat ? Math.round((values.reduce((s, v) => s + v, 0) / sat) * 10) / 10 : null,
          average_percent: sat && total > 0
            ? Math.round((values.reduce((s, v) => s + v, 0) / sat / total) * 1000) / 10
            : null,
          highest: sat ? Math.max(...values) : null,
          lowest: sat ? Math.min(...values) : null,
          passed: sat ? values.filter((v) => v >= pass).length : 0,
          failed: sat ? values.filter((v) => v < pass).length : 0,
          pass_rate: sat ? Math.round((values.filter((v) => v >= pass).length / sat) * 100) : null,
        },
      });
    }
  }

  // Per-exam roll-up (kept for the summary table).
  const examAnalysis = exams.map((e) => {
    const values = gradeRows
      .filter((g) => g.exam_id === e.id && g.marks_obtained != null)
      .map((g) => Number(g.marks_obtained));
    const total = Number(e.total_marks || 0);
    const pass = Number(e.pass_marks || 0);
    const sat = values.length;
    return {
      exam_id: e.id,
      name: e.name,
      type: e.type,
      date: e.date,
      subject_name: e.subject_name,
      total_marks: total,
      pass_marks: pass,
      sat,
      average: sat ? Math.round((values.reduce((s, v) => s + v, 0) / sat) * 10) / 10 : null,
      average_percent: sat && total > 0
        ? Math.round((values.reduce((s, v) => s + v, 0) / sat / total) * 1000) / 10
        : null,
      highest: sat ? Math.max(...values) : null,
      lowest: sat ? Math.min(...values) : null,
      passed: sat ? values.filter((v) => v >= pass).length : 0,
      failed: sat ? values.filter((v) => v < pass).length : 0,
      pass_rate: sat ? Math.round((values.filter((v) => v >= pass).length / sat) * 100) : null,
    };
  });

  // Overall per student across subjects (equal weight per subject).
  const overall = students.map((st) => {
    const values = subjects
      .map((s) => s.students.find((r) => r.student_id === st.student_id))
      .filter((r) => r && r.percent != null)
      .map((r) => r.percent);
    const avg = values.length
      ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
      : null;
    return {
      student_id: st.student_id,
      first_name: st.first_name,
      middle_name: st.middle_name,
      last_name: st.last_name,
      student_number: st.student_number,
      class_name: st.class_name,
      subjects_count: values.length,
      percent: avg,
      grade_letter: avg == null ? null : grading.letterFor(scale, avg),
      passed: avg == null ? null : avg >= passPct,
    };
  });
  overall.sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));

  return {
    exams,
    students: students.map((s) => ({
      student_id: s.student_id,
      first_name: s.first_name,
      middle_name: s.middle_name,
      last_name: s.last_name,
      student_number: s.student_number,
      class_id: s.class_id,
      class_name: s.class_name,
    })),
    subjects,
    exam_analysis: examAnalysis,
    exam_breakdown: examBreakdown,
    overall,
    scheme,
    pass_pct: passPct,
    scale,
  };
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
  getClassResults,
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
  getOverviewReport,
};
