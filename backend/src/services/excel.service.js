const ExcelJS = require('exceljs');
const db = require('../config/database');
const reportingService = require('../modules/reports/reporting.service');

const r2 = (v) => (v == null ? null : Math.round(Number(v) * 100) / 100);
const fullName = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim();
const fmtDate = (d) => {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? s.slice(0, 10) : dt.toISOString().slice(0, 10);
};

// ── Detail datasets (standardized, like the seed sheets but cleaner) ──

// Leave sheet: all staff (not only teachers) with approved leave + day counts
async function leaveSheet(tenantId, f) {
  const { s, e } = rangeOf(f);
  const rows = await db('leaves as l')
    .join('users as u', 'l.staff_id', 'u.id')
    .where('l.tenant_id', tenantId)
    .where('l.status', 'approved')
    .where('l.start_date', '<=', e)
    .where('l.end_date', '>=', s)
    .select(db.raw("u.first_name || ' ' || u.last_name as name"), 'u.role', 'u.job_title',
      'l.leave_type', 'l.start_date', 'l.end_date', 'l.reason',
      db.raw("(l.end_date::date - l.start_date::date) + 1 as days"))
    .orderBy('l.start_date').orderBy('name');
  const totals = rows.reduce((acc, r) => {
    acc.days += Number(r.days) || 0;
    acc.staff.add(r.name);
    return acc;
  }, { days: 0, staff: new Set() });
  return {
    name: 'Leave',
    columns: [
      { header: 'Staff', key: 'name', width: 28 }, { header: 'Role', key: 'role', width: 16 },
      { header: 'Job Title', key: 'job_title', width: 22 }, { header: 'Leave Type', key: 'leave_type', width: 18 },
      { header: 'Start', key: 'start_date', width: 13 }, { header: 'End', key: 'end_date', width: 13 },
      { header: 'Days', key: 'days', width: 8 }, { header: 'Reason', key: 'reason', width: 40 },
    ],
    rows: rows.map((x) => ({
      name: x.name, role: x.role, job_title: x.job_title, leave_type: x.leave_type,
      start_date: fmtDate(x.start_date), end_date: fmtDate(x.end_date), days: Number(x.days) || 0, reason: x.reason || '',
    })),
    footer: `Total: ${rows.length} staff took leave · ${totals.days} days`,
  };
}

// Staff attendance sheet: per-staff present/late/absent/leave counts over the period
async function staffAttendanceSheet(tenantId, f) {
  const { s, e } = rangeOf(f);
  const rows = await db('staff_attendance as a')
    .join('users as u', 'a.staff_id', 'u.id')
    .where('a.tenant_id', tenantId)
    .whereBetween('a.date', [s, e])
    .groupBy('u.first_name', 'u.last_name', 'u.role', 'u.job_title')
    .select(db.raw("u.first_name || ' ' || u.last_name as name"), 'u.role', 'u.job_title')
    .select(db.raw("count(*) filter (where a.status = 'present') as present"))
    .select(db.raw("count(*) filter (where a.status = 'late') as late"))
    .select(db.raw("count(*) filter (where a.status = 'absent') as absent"))
    .select(db.raw("count(*) filter (where a.status in ('leave','on_leave')) as leave"))
    .select(db.raw("count(*) filter (where a.status = 'emergency') as emergency"))
    .select(db.raw("count(*) filter (where a.status = 'half_day') as half_day"))
    .select(db.raw('count(*) as total'))
    .orderBy('name');
  return {
    name: 'Staff Attendance',
    columns: [
      { header: 'Staff', key: 'name', width: 28 }, { header: 'Role', key: 'role', width: 16 },
      { header: 'Job Title', key: 'job_title', width: 22 }, { header: 'Present', key: 'present', width: 9 },
      { header: 'Late', key: 'late', width: 7 }, { header: 'Absent', key: 'absent', width: 8 },
      { header: 'Leave', key: 'leave', width: 8 }, { header: 'Emergency', key: 'emergency', width: 10 },
      { header: 'Half Day', key: 'half_day', width: 9 }, { header: 'Marked', key: 'total', width: 8 },
      { header: 'Attendance %', key: 'rate', width: 13 },
    ],
    rows: rows.map((x) => {
      const marked = Number(x.total);
      const attended = Number(x.present) + Number(x.late) + Number(x.leave) + Number(x.emergency);
      return {
        name: x.name, role: x.role, job_title: x.job_title, present: Number(x.present), late: Number(x.late),
        absent: Number(x.absent), leave: Number(x.leave), emergency: Number(x.emergency), half_day: Number(x.half_day),
        total: marked, rate: marked ? Math.round((attended / marked) * 1000) / 10 : 0,
      };
    }),
  };
}

// Overtime sheet: entries recorded on the HR overtime page
async function overtimeSheet(tenantId, f) {
  const { s, e } = rangeOf(f);
  const rows = await db('staff_overtime as ot')
    .join('users as u', 'ot.staff_id', 'u.id')
    .where('ot.tenant_id', tenantId)
    .whereBetween('ot.date', [s, e])
    .select(db.raw("u.first_name || ' ' || u.last_name as name"), 'u.role',
      'ot.date', 'ot.hours', 'ot.overtime_type', 'ot.multiplier', 'ot.hourly_rate', 'ot.amount', 'ot.status')
    .orderBy('ot.date').orderBy('name');
  return {
    name: 'Overtime',
    columns: [
      { header: 'Staff', key: 'name', width: 28 }, { header: 'Role', key: 'role', width: 16 },
      { header: 'Date', key: 'date', width: 13 }, { header: 'Hours', key: 'hours', width: 8 },
      { header: 'Type', key: 'overtime_type', width: 14 }, { header: 'Rate (x)', key: 'multiplier', width: 9 },
      { header: 'Hourly (ETB)', key: 'hourly_rate', width: 13 }, { header: 'Amount (ETB)', key: 'amount', width: 13 },
      { header: 'Status', key: 'status', width: 11 },
    ],
    rows: rows.map((x) => ({
      name: x.name, role: x.role, date: fmtDate(x.date), hours: r2(x.hours), overtime_type: x.overtime_type,
      multiplier: r2(x.multiplier), hourly_rate: r2(x.hourly_rate), amount: r2(x.amount), status: x.status,
    })),
  };
}

async function hrSheets(tenantId, f) {
  const staff = await db('users').where({ tenant_id: tenantId }).whereNotIn('role', ['student', 'parent'])
    .select('first_name', 'last_name', 'username', 'email', 'role', 'job_title', 'gender', 'phone',
      'qualification', 'field_of_study', 'joined_at', 'status',
      'basic_salary', 'allowance', 'housing_allowance', 'account_allowance', 'phone_allowance')
    .select(db.raw('(select count(*) from teacher_subjects ts where ts.teacher_id = users.id) as assignments'))
    .orderBy('role').orderBy('first_name');
  const staffSheet = {
    name: 'Staff',
    columns: [
      { header: 'Full Name', key: 'name', width: 28 }, { header: 'Username', key: 'username', width: 20 },
      { header: 'Email', key: 'email', width: 34 }, { header: 'Role', key: 'role', width: 16 },
      { header: 'Job Title', key: 'job_title', width: 22 }, { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Phone', key: 'phone', width: 16 }, { header: 'Qualification', key: 'qualification', width: 14 },
      { header: 'Field of Study', key: 'field_of_study', width: 22 }, { header: 'Joined', key: 'joined_at', width: 13 },
      { header: 'Status', key: 'status', width: 11 }, { header: 'Basic Salary', key: 'basic_salary', width: 13 },
      { header: 'Allowance', key: 'allowance', width: 11 }, { header: 'Housing', key: 'housing_allowance', width: 11 },
      { header: 'Account', key: 'account_allowance', width: 11 }, { header: 'Phone Allow.', key: 'phone_allowance', width: 12 },
      { header: 'Assignments', key: 'assignments', width: 12 },
    ],
    rows: staff.map((u) => ({
      name: fullName(u), username: u.username, email: u.email, role: u.role, job_title: u.job_title,
      gender: u.gender, phone: u.phone, qualification: u.qualification, field_of_study: u.field_of_study,
      joined_at: fmtDate(u.joined_at), status: u.status, basic_salary: r2(u.basic_salary), allowance: r2(u.allowance),
      housing_allowance: r2(u.housing_allowance), account_allowance: r2(u.account_allowance),
      phone_allowance: r2(u.phone_allowance), assignments: Number(u.assignments) || 0,
    })),
  };
  const unassigned = staff.filter((u) => u.role === 'teacher' && !Number(u.assignments));
  const extra = [leaveSheet(tenantId, f), staffAttendanceSheet(tenantId, f), overtimeSheet(tenantId, f)];
  const [leave, att, ot] = await Promise.all(extra);
  return [staffSheet, {
    name: 'Teachers w-o Assignment',
    columns: [{ header: 'Full Name', key: 'name', width: 28 }, { header: 'Job Title', key: 'job_title', width: 22 }, { header: 'Phone', key: 'phone', width: 16 }],
    rows: unassigned.map((u) => ({ name: fullName(u), job_title: u.job_title, phone: u.phone })),
  }, leave, att, ot];
}

async function attendanceSheets(tenantId, f) {
  const { s, e } = rangeOf(f);
  const rows = await db('attendance as a')
    .join('students as st', 'a.student_id', 'st.id').join('users as u', 'st.user_id', 'u.id').leftJoin('classes as c', 'st.class_id', 'c.id')
    .where('a.tenant_id', tenantId).whereBetween('a.date', [s, e])
    .groupBy('u.first_name', 'u.last_name', 'st.student_number', 'c.name', 'c.grade_level', 'c.section')
    .select(db.raw("u.first_name || ' ' || u.last_name as name"), 'st.student_number', 'c.name as class', 'c.grade_level', 'c.section')
    .select(db.raw("count(*) filter (where lower(a.status)='present') as present"))
    .select(db.raw("count(*) filter (where lower(a.status)='late') as late"))
    .select(db.raw("count(*) filter (where lower(a.status)='absent') as absent"))
    .select(db.raw('count(*) as total'))
    .orderBy('class').orderBy('name');
  return [{
    name: 'Student Attendance',
    columns: [
      { header: 'Student', key: 'name', width: 28 }, { header: 'Student ID', key: 'student_number', width: 14 },
      { header: 'Class', key: 'class', width: 16 }, { header: 'Grade', key: 'grade_level', width: 8 },
      { header: 'Section', key: 'section', width: 9 }, { header: 'Present', key: 'present', width: 9 },
      { header: 'Late', key: 'late', width: 8 }, { header: 'Absent', key: 'absent', width: 9 },
      { header: 'Total', key: 'total', width: 8 }, { header: 'Attendance %', key: 'rate', width: 13 },
    ],
    rows: rows.map((x) => ({
      name: x.name, student_number: x.student_number, class: x.class, grade_level: x.grade_level, section: x.section,
      present: Number(x.present), late: Number(x.late), absent: Number(x.absent), total: Number(x.total),
      rate: Number(x.total) ? Math.round(((Number(x.present) + Number(x.late)) / Number(x.total)) * 1000) / 10 : 0,
    })),
  }];
}

async function paymentsSheet(tenantId, f) {
  const { s, e } = rangeOf(f);
  const rows = await db('payments as p').join('students as st', 'p.student_id', 'st.user_id').join('users as u', 'st.user_id', 'u.id').leftJoin('classes as c', 'st.class_id', 'c.id')
    .where('p.tenant_id', tenantId).whereBetween('p.paid_date', [s, e])
    .select('p.paid_date', 'p.amount_paid', 'p.payment_method', 'p.transaction_id', 'p.status')
    .select(db.raw("u.first_name || ' ' || u.last_name as name"), 'st.student_number', 'c.name as class')
    .orderBy('p.paid_date', 'desc');
  return {
    name: 'Payments',
    columns: [
      { header: 'Date', key: 'date', width: 13 }, { header: 'Student', key: 'name', width: 28 },
      { header: 'Student ID', key: 'student_number', width: 14 }, { header: 'Class', key: 'class', width: 16 },
      { header: 'Amount', key: 'amount', width: 12 }, { header: 'Method', key: 'method', width: 12 },
      { header: 'Receipt/Ref', key: 'txn', width: 22 }, { header: 'Status', key: 'status', width: 11 },
    ],
    rows: rows.map((x) => ({ date: fmtDate(x.paid_date), name: x.name, student_number: x.student_number, class: x.class, amount: r2(x.amount_paid), method: x.payment_method, txn: x.transaction_id, status: x.status })),
  };
}

async function outstandingSheet(tenantId) {
  const rows = await db('student_monthly_bills as b').join('students as st', 'b.student_id', 'st.id').join('users as u', 'st.user_id', 'u.id').leftJoin('classes as c', 'st.class_id', 'c.id')
    .where('b.tenant_id', tenantId).where('b.status', 'unpaid')
    .groupBy('u.first_name', 'u.last_name', 'st.student_number', 'c.name', 'c.grade_level', 'c.section')
    .select(db.raw("u.first_name || ' ' || u.last_name as name"), 'st.student_number', 'c.name as class', 'c.grade_level', 'c.section')
    .select(db.raw('COALESCE(SUM(b.amount + b.penalty - b.amount_paid),0) as due'))
    .select(db.raw('MIN(b.created_at) as oldest'))
    .orderBy('due', 'desc');
  return {
    name: 'Outstanding Balances',
    columns: [
      { header: 'Student', key: 'name', width: 28 }, { header: 'Student ID', key: 'student_number', width: 14 },
      { header: 'Class', key: 'class', width: 16 }, { header: 'Grade', key: 'grade_level', width: 8 },
      { header: 'Section', key: 'section', width: 9 }, { header: 'Amount Due', key: 'due', width: 13 },
      { header: 'Oldest Bill', key: 'oldest', width: 13 },
    ],
    rows: rows.map((x) => ({ name: x.name, student_number: x.student_number, class: x.class, grade_level: x.grade_level, section: x.section, due: r2(x.due), oldest: fmtDate(x.oldest) })),
  };
}

async function academicsSheets(tenantId, f) {
  const { s, e } = rangeOf(f);
  const rows = await db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id').leftJoin('subjects as sub', 'ex.subject_id', 'sub.id').leftJoin('classes as c', 'ex.class_id', 'c.id')
    .join('students as st', 'g.student_id', 'st.id').join('users as u', 'st.user_id', 'u.id')
    .where('ex.tenant_id', tenantId).whereBetween('ex.date', [s, e]).whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0)
    .select(db.raw("u.first_name || ' ' || u.last_name as name"), 'st.student_number', 'c.name as class', 'sub.name as subject', 'ex.name as exam', 'ex.date', 'g.marks_obtained', 'ex.total_marks')
    .orderBy('class').orderBy('subject').orderBy('name');
  return [{
    name: 'Exam Results',
    columns: [
      { header: 'Student', key: 'name', width: 28 }, { header: 'Student ID', key: 'student_number', width: 14 },
      { header: 'Class', key: 'class', width: 16 }, { header: 'Subject', key: 'subject', width: 18 },
      { header: 'Exam', key: 'exam', width: 22 }, { header: 'Date', key: 'date', width: 13 },
      { header: 'Marks', key: 'marks', width: 10 }, { header: 'Total', key: 'total', width: 10 },
      { header: '%', key: 'pct', width: 8 }, { header: 'Grade', key: 'letter', width: 8 },
    ],
    rows: rows.map((x) => {
      const pct = (Number(x.marks_obtained) / Number(x.total_marks)) * 100;
      return { name: x.name, student_number: x.student_number, class: x.class, subject: x.subject, exam: x.exam, date: fmtDate(x.date), marks: r2(x.marks_obtained), total: r2(x.total_marks), pct: Math.round(pct * 10) / 10, letter: pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F' };
    }),
  }];
}

async function studentsRosterSheet(tenantId) {
  const rows = await db('students as st').join('users as u', 'st.user_id', 'u.id').leftJoin('classes as c', 'st.class_id', 'c.id')
    .where('st.tenant_id', tenantId).where('st.status', 'active')
    .select(db.raw("u.first_name || ' ' || u.last_name as name"), 'st.student_number', 'c.name as class', 'c.grade_level', 'c.section', 'u.gender', 'u.phone', 'st.status')
    .orderBy('c.grade_level').orderBy('c.section').orderBy('name');
  const list = rows;
  return {
    name: 'Students',
    columns: [
      { header: 'Student', key: 'name', width: 28 }, { header: 'Student ID', key: 'student_number', width: 14 },
      { header: 'Class', key: 'class', width: 16 }, { header: 'Grade', key: 'grade_level', width: 8 },
      { header: 'Section', key: 'section', width: 9 }, { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Phone', key: 'phone', width: 16 }, { header: 'Status', key: 'status', width: 11 },
    ],
    rows: list.map((x) => ({ name: x.name, student_number: x.student_number, class: x.class, grade_level: x.grade_level, section: x.section, gender: x.gender, phone: x.phone, status: x.status })),
  };
}

// Full student master — matches the school's "Student_info_report" layout, clean
// (deduped) and enriched with grade/section split + payment settlement.
async function studentsMasterSheet(tenantId) {
  const hasMiddle = await db.schema.hasColumn('users', 'middle_name').catch(() => false);
  const rows = await db('students as st').join('users as u', 'st.user_id', 'u.id').leftJoin('classes as c', 'st.class_id', 'c.id')
    .where('st.tenant_id', tenantId)
    .select('st.id', 'st.student_number', 'st.enrollment_date', 'st.mother_phone', 'st.father_phone', 'u.first_name', 'u.last_name', 'u.gender', 'u.phone', 'st.status', 'c.name as class', 'c.grade_level', 'c.section', 'c.level_group')
    .select(hasMiddle ? 'u.middle_name' : db.raw('null as middle_name'))
    .orderBy('c.grade_level').orderBy('c.section').orderBy('u.first_name');

  const list = rows;
  const ids = list.map((r) => r.id);
  const pay = ids.length
    ? await db('student_monthly_bills').whereIn('student_id', ids).groupBy('student_id')
      .select('student_id').sum('amount as billed').sum('amount_paid as paid').catch(() => [])
    : [];
  const payMap = {};
  for (const p of pay) payMap[p.student_id] = { billed: Number(p.billed) || 0, paid: Number(p.paid) || 0 };

  const columns = [
    { header: 'SI No.', key: 'si', width: 7 }, { header: 'Student ID', key: 'student_number', width: 14 },
    { header: 'First Name', key: 'first_name', width: 16 }, { header: 'Middle Name', key: 'middle_name', width: 16 },
    { header: 'Last Name', key: 'last_name', width: 16 }, { header: 'Class Code', key: 'class_code', width: 12 },
    { header: 'Grade', key: 'grade_level', width: 8 }, { header: 'Section', key: 'section', width: 10 },
    { header: 'Class', key: 'class', width: 14 }, { header: 'Guardian Phone', key: 'phone', width: 16 },
    { header: "Mother's Phone", key: 'mother_phone', width: 16 }, { header: "Father's Phone", key: 'father_phone', width: 16 },
    { header: 'Gender', key: 'gender', width: 8 }, { header: 'Status', key: 'status', width: 10 },
    { header: 'Admitted', key: 'enrollment_date', width: 12 },
    { header: 'Billed (ETB)', key: 'billed', width: 12 }, { header: 'Paid (ETB)', key: 'paid', width: 12 },
    { header: 'Balance (ETB)', key: 'balance', width: 13 },
  ];
  const data = list.map((r, i) => {
    const s = payMap[r.id] || { billed: 0, paid: 0 };
    const code = r.level_group ? String(r.level_group).toUpperCase().replace(/\s+/g, '') : `GRADE${r.grade_level ?? ''}`;
    return {
      si: i + 1, student_number: r.student_number || '', first_name: r.first_name || '', middle_name: r.middle_name || '',
      last_name: r.last_name || '', class_code: code, grade_level: r.grade_level ?? '', section: r.section || '',
      class: r.class || '', phone: r.phone || '', gender: r.gender || '', status: r.status || '',
      mother_phone: r.mother_phone || '', father_phone: r.father_phone || '',
      enrollment_date: fmtDate(r.enrollment_date),
      billed: r2(s.billed), paid: r2(s.paid), balance: r2(s.billed - s.paid),
    };
  });
  return [{ name: 'Students', columns, rows: data }];
}

async function enrollmentSheet(tenantId) {
  const rows = await db('classes as c').where('c.tenant_id', tenantId)
    .leftJoin('students as st', function () { this.on('c.id', '=', 'st.class_id'); })
    .where(function () { this.whereNull('st.id').orWhere('st.status', 'active'); })
    .groupBy('c.id', 'c.name', 'c.grade_level', 'c.section')
    .select('c.name as class', 'c.grade_level as grade', 'c.section')
    .count('st.id as students')
    .orderBy('c.grade_level').orderBy('c.section');
  return [{
    name: 'Enrollment',
    columns: [{ header: 'Class', key: 'class', width: 18 }, { header: 'Grade', key: 'grade', width: 8 }, { header: 'Section', key: 'section', width: 10 }, { header: 'Students', key: 'students', width: 10 }],
    rows: rows.map((r) => ({ ...r, students: Number(r.students) || 0 })),
  }];
}

async function teacherLoadSheet(tenantId) {
  const rows = await db('teacher_subjects as ts').join('users as t', 'ts.teacher_id', 't.id').join('classes as c', 'ts.class_id', 'c.id').join('subjects as s', 'ts.subject_id', 's.id')
    .where('ts.tenant_id', tenantId)
    .select(db.raw("t.first_name || ' ' || t.last_name as teacher"), 's.name as subject', 'c.name as class')
    .orderBy('teacher').orderBy('class');
  const teachers = await db('users').where({ tenant_id: tenantId, role: 'teacher' }).whereNot('status', 'inactive')
    .select(db.raw("first_name || ' ' || last_name as teacher")).orderBy('first_name');
  const map = new Map();
  for (const t of teachers) map.set(t.teacher, []);
  for (const r of rows) {
    if (!map.has(r.teacher)) map.set(r.teacher, []);
    map.get(r.teacher).push(`${r.subject} — ${r.class}`);
  }
  const data = [...map.entries()].map(([teacher, items]) => ({
    teacher, assignments: items.length, subjects_classes: items.join('; '),
  })).sort((a, b) => b.assignments - a.assignments || a.teacher.localeCompare(b.teacher));
  return [{
    name: 'Teacher Workload',
    columns: [{ header: 'Teacher', key: 'teacher', width: 28 }, { header: 'Assignments', key: 'assignments', width: 12 }, { header: 'Subjects & Classes', key: 'subjects_classes', width: 90 }],
    rows: data,
  }];
}

function safeSheetName(name, used) {
  let base = String(name || 'Class').replace(/[\\/*?:[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Class';
  let final = base, i = 2;
  while (used.has(final)) { const suffix = ` ${i++}`; final = base.slice(0, 31 - suffix.length) + suffix; }
  used.add(final);
  return final;
}

async function studentsByClassSheets(tenantId) {
  const rows = await db('students as st').join('users as u', 'st.user_id', 'u.id').leftJoin('classes as c', 'st.class_id', 'c.id')
    .where('st.tenant_id', tenantId).where(function () { this.whereNull('st.status').orWhereNot('st.status', 'archived'); })
    .select('st.id', 'st.student_number', 'st.enrollment_date', 'u.first_name', 'u.last_name', 'u.gender', 'u.phone', 'st.status', 'c.name as class', 'c.grade_level', 'c.section')
    .orderBy('c.grade_level').orderBy('c.section').orderBy('u.first_name');

  const byClass = new Map();
  for (const r of rows) {
    const cname = r.class || 'Unassigned';
    if (!byClass.has(cname)) byClass.set(cname, []);
    byClass.get(cname).push(r);
  }

  const columns = [
    { header: 'SI No.', key: 'si', width: 7 }, { header: 'Student ID', key: 'student_number', width: 14 },
    { header: 'First Name', key: 'first_name', width: 16 }, { header: 'Last Name', key: 'last_name', width: 16 },
    { header: 'Gender', key: 'gender', width: 8 }, { header: 'Guardian Phone', key: 'phone', width: 16 },
    { header: 'Grade', key: 'grade_level', width: 8 }, { header: 'Section', key: 'section', width: 10 },
    { header: 'Status', key: 'status', width: 10 }, { header: 'Admitted', key: 'enrollment_date', width: 12 },
  ];
  const used = new Set();
  const sheets = [];
  for (const [cname, list] of byClass) {
    sheets.push({
      name: safeSheetName(cname, used),
      columns,
      rows: list.map((r, i) => ({
        si: i + 1, student_number: r.student_number || '', first_name: r.first_name || '', last_name: r.last_name || '',
        gender: r.gender || '', phone: r.phone || '', grade_level: r.grade_level ?? '', section: r.section || '',
        status: r.status || '', enrollment_date: fmtDate(r.enrollment_date),
      })),
    });
  }
  return sheets;
}

async function streamNamedWorkbook(kind, tenantId, res) {
  const builders = { enrollment: enrollmentSheet, 'teacher-load': teacherLoadSheet, students: studentsMasterSheet, 'students-by-class': studentsByClassSheets };
  const build = builders[kind];
  if (!build) return false;
  const sheets = await build(tenantId);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Mount Olive SMS';
  for (const s of sheets) addSheet(wb, s);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${kind}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
  return true;
}

async function myStudentsSheet(tenantId, teacherId) {
  const rows = await db('teacher_subjects as ts').join('classes as c', 'ts.class_id', 'c.id').join('subjects as sub', 'ts.subject_id', 'sub.id')
    .join('students as st', 'st.class_id', 'c.id').join('users as u', 'st.user_id', 'u.id')
    .where('ts.teacher_id', teacherId).where('st.status', 'active')
    .distinct(db.raw("u.first_name || ' ' || u.last_name as name"), 'st.student_number', 'c.name as class', 'sub.name as subject')
    .orderBy('class').orderBy('subject').orderBy('name');
  return [{ name: 'My Students', columns: [{ header: 'Student', key: 'name', width: 28 }, { header: 'Student ID', key: 'student_number', width: 14 }, { header: 'Class', key: 'class', width: 16 }, { header: 'Subject', key: 'subject', width: 18 }], rows }];
}

async function studentSheets(tenantId, userId, f) {
  const { s, e } = rangeOf(f);
  const student = await db('students').where({ tenant_id: tenantId, user_id: userId }).first();
  if (!student) return [];
  const results = await db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id').leftJoin('subjects as sub', 'ex.subject_id', 'sub.id')
    .where('g.student_id', student.id).whereBetween('ex.date', [s, e]).whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0)
    .select('sub.name as subject', 'ex.name as exam', 'ex.date', 'g.marks_obtained', 'ex.total_marks');
  return [{
    name: 'My Results',
    columns: [{ header: 'Subject', key: 'subject', width: 18 }, { header: 'Exam', key: 'exam', width: 22 }, { header: 'Date', key: 'date', width: 13 }, { header: 'Marks', key: 'marks', width: 10 }, { header: 'Total', key: 'total', width: 10 }, { header: '%', key: 'pct', width: 8 }],
    rows: results.map((x) => ({ subject: x.subject, exam: x.exam, date: fmtDate(x.date), marks: r2(x.marks_obtained), total: r2(x.total_marks), pct: Math.round((Number(x.marks_obtained) / Number(x.total_marks)) * 1000) / 10 })),
  }];
}

async function childrenSheet(tenantId, userId) {
  const rows = await db('student_parents as sp').join('students as st', 'sp.student_id', 'st.id').join('users as u', 'st.user_id', 'u.id').leftJoin('classes as c', 'st.class_id', 'c.id')
    .where('sp.parent_id', userId)
    .select(db.raw("u.first_name || ' ' || u.last_name as name"), 'st.student_number', 'c.name as class', 'c.grade_level', 'c.section', 'st.status');
  return [{ name: 'My Children', columns: [{ header: 'Child', key: 'name', width: 28 }, { header: 'Student ID', key: 'student_number', width: 14 }, { header: 'Class', key: 'class', width: 16 }, { header: 'Grade', key: 'grade_level', width: 8 }, { header: 'Section', key: 'section', width: 9 }, { header: 'Status', key: 'status', width: 11 }], rows }];
}

async function assetsSheet(tenantId) {
  const rows = await db('school_assets').where({ tenant_id: tenantId }).select('name', 'asset_code', 'category', 'quantity', 'unit_cost', 'total_cost', 'location', 'status', 'purchase_date').orderBy('category').catch(() => []);
  return [{ name: 'Assets', columns: [{ header: 'Name', key: 'name', width: 26 }, { header: 'Code', key: 'asset_code', width: 14 }, { header: 'Category', key: 'category', width: 16 }, { header: 'Qty', key: 'quantity', width: 8 }, { header: 'Unit Cost', key: 'unit_cost', width: 12 }, { header: 'Total Cost', key: 'total_cost', width: 12 }, { header: 'Location', key: 'location', width: 18 }, { header: 'Status', key: 'status', width: 13 }, { header: 'Purchased', key: 'purchase_date', width: 13 }], rows: rows.map((x) => ({ ...x, unit_cost: r2(x.unit_cost), total_cost: r2(x.total_cost), purchase_date: fmtDate(x.purchase_date) })) }];
}

function rangeOf(f = {}) {
  const end = f.to ? new Date(`${f.to}T00:00:00Z`) : new Date();
  const start = f.from ? new Date(`${f.from}T00:00:00Z`) : new Date(end.getTime() - 89 * 864e5);
  return { s: start.toISOString().slice(0, 10), e: end.toISOString().slice(0, 10) };
}

async function securitySheets(tenantId, f) {
  const { s, e } = rangeOf(f);
  const visitors = await db('visitor_logs').where({ tenant_id: tenantId }).whereBetween('time_in', [s, e])
    .select('visitor_name', 'phone', 'person_visited', 'purpose', 'badge_number', 'time_in', 'time_out').orderBy('time_in', 'desc').catch(() => []);
  const incidents = await db('campus_incidents').where({ tenant_id: tenantId }).whereBetween('incident_date', [s, e])
    .select('title', 'location', 'incident_date', 'category', 'severity', 'status', 'escalated_to_gm').orderBy('incident_date', 'desc').catch(() => []);
  const gates = await db('student_gate_passes').where({ tenant_id: tenantId }).whereBetween('departure_date', [s, e])
    .select('pass_code', 'departure_date', 'departure_time', 'reason', 'authorized_pickup_person', 'status').orderBy('departure_date', 'desc').catch(() => []);
  return [
    { name: 'Visitors', columns: [{ header: 'Visitor', key: 'visitor_name', width: 26 }, { header: 'Phone', key: 'phone', width: 16 }, { header: 'Visited', key: 'person_visited', width: 24 }, { header: 'Purpose', key: 'purpose', width: 26 }, { header: 'Badge', key: 'badge_number', width: 12 }, { header: 'In', key: 'time_in', width: 20 }, { header: 'Out', key: 'time_out', width: 20 }], rows: visitors },
    { name: 'Incidents', columns: [{ header: 'Title', key: 'title', width: 28 }, { header: 'Location', key: 'location', width: 18 }, { header: 'Date', key: 'incident_date', width: 13 }, { header: 'Category', key: 'category', width: 18 }, { header: 'Severity', key: 'severity', width: 12 }, { header: 'Status', key: 'status', width: 14 }, { header: 'Escalated', key: 'escalated_to_gm', width: 11 }], rows: incidents.map((x) => ({ ...x, incident_date: fmtDate(x.incident_date), escalated_to_gm: x.escalated_to_gm ? 'Yes' : 'No' })) },
    { name: 'Gate Passes', columns: [{ header: 'Pass Code', key: 'pass_code', width: 14 }, { header: 'Date', key: 'departure_date', width: 13 }, { header: 'Time', key: 'departure_time', width: 12 }, { header: 'Reason', key: 'reason', width: 28 }, { header: 'Pickup By', key: 'authorized_pickup_person', width: 22 }, { header: 'Status', key: 'status', width: 16 }], rows: gates.map((x) => ({ ...x, departure_date: fmtDate(x.departure_date) })) },
  ];
}

async function shiftsSheets(tenantId, f) {
  const { s, e } = rangeOf(f);
  const subs = await db('teacher_substitutions as ts').leftJoin('users as o', 'ts.original_teacher_id', 'o.id').leftJoin('users as s2', 'ts.substitute_teacher_id', 's2.id')
    .where('ts.tenant_id', tenantId).whereBetween('ts.date', [s, e])
    .select(db.raw("o.first_name || ' ' || o.last_name as original"), db.raw("s2.first_name || ' ' || s2.last_name as substitute"), 'ts.date', 'ts.period_name', 'ts.reason', 'ts.status')
    .orderBy('ts.date', 'desc').catch(() => []);
  return [{ name: 'Substitutions', columns: [{ header: 'Original Teacher', key: 'original', width: 26 }, { header: 'Substitute', key: 'substitute', width: 26 }, { header: 'Date', key: 'date', width: 13 }, { header: 'Period', key: 'period_name', width: 20 }, { header: 'Reason', key: 'reason', width: 22 }, { header: 'Status', key: 'status', width: 14 }], rows: subs.map((x) => ({ ...x, date: fmtDate(x.date) })) }];
}

async function qualitySheets(tenantId) {
  const rows = await db('teacher_kpi_metrics as k').join('users as t', 'k.teacher_id', 't.id').where('k.tenant_id', tenantId)
    .select(db.raw("t.first_name || ' ' || t.last_name as teacher"), 'k.period_name', 'k.attendance_rate', 'k.punctuality_rate', 'k.substitutions_covered', 'k.student_feedback_score', 'k.syllabus_completion_rate', 'k.overall_rating')
    .orderBy('k.period_name', 'desc').catch(() => []);
  return [{ name: 'Teacher KPIs', columns: [{ header: 'Teacher', key: 'teacher', width: 26 }, { header: 'Period', key: 'period_name', width: 16 }, { header: 'Attendance %', key: 'attendance_rate', width: 13 }, { header: 'Punctuality %', key: 'punctuality_rate', width: 13 }, { header: 'Substitutions', key: 'substitutions_covered', width: 13 }, { header: 'Feedback', key: 'student_feedback_score', width: 11 }, { header: 'Syllabus %', key: 'syllabus_completion_rate', width: 12 }, { header: 'Overall', key: 'overall_rating', width: 10 }], rows }];
}

async function detailSheets(reportId, tenantId, userId, f) {
  try {
    switch (reportId) {
      case 'hr': return await hrSheets(tenantId, f);
      case 'attendance': return await attendanceSheets(tenantId, f);
      case 'finance': return [await paymentsSheet(tenantId, f), await outstandingSheet(tenantId)];
      case 'cashier': return [await paymentsSheet(tenantId, f)];
      case 'academics': return await academicsSheets(tenantId, f);
      case 'overview': return [await studentsRosterSheet(tenantId)];
      case 'teacher': return await myStudentsSheet(tenantId, userId);
      case 'student': return await studentSheets(tenantId, userId, f);
      case 'parent': return await childrenSheet(tenantId, userId);
      case 'operations': return await assetsSheet(tenantId);
      case 'security': return await securitySheets(tenantId, f);
      case 'shifts': return await shiftsSheets(tenantId, f);
      case 'quality': return await qualitySheets(tenantId);
      default: return [];
    }
  } catch {
    return [];
  }
}

function addSheet(wb, sheet) {
  const ws = wb.addWorksheet(sheet.name);
  ws.columns = sheet.columns;
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5A5E' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  for (const row of sheet.rows) ws.addRow(row);
  if (sheet.footer) {
    const fr = ws.addRow([sheet.footer]);
    fr.font = { italic: true, color: { argb: 'FF6B7280' } };
  }
  ws.autoFilter = { from: 'A1', to: { row: 1, column: sheet.columns.length } };
  return ws;
}

function addSummary(wb, payload) {
  const ws = wb.addWorksheet('Summary');
  ws.columns = [{ width: 34 }, { width: 18 }, { width: 10 }, { width: 12 }];
  ws.addRow([payload.title || 'Report']).font = { bold: true, size: 14 };
  ws.addRow(['Period', `${payload.period?.from || ''} - ${payload.period?.to || ''}`]);
  ws.addRow([payload.tableCount ? `${payload.tableCount} detailed list sheet(s) are in the other tabs of this workbook.` : '']).font = { italic: true, color: { argb: 'FF6B7280' } };
  ws.addRow([]);
  ws.addRow(['Key Metrics']).font = { bold: true };
  ws.addRow(['Metric', 'Value', 'Unit', 'Delta %']);
  for (const v of Object.values(payload.kpis || {})) ws.addRow([v.label || '', v.value ?? '', v.unit || '', v.delta ?? '']);
  for (const sec of payload.sections || []) {
    if (!sec.data?.length) continue;
    ws.addRow([]);
    ws.addRow([sec.title || '']).font = { bold: true };
    ws.addRow(['Label', 'Value']);
    for (const r of sec.data) ws.addRow([r.label ?? '', r.value ?? '']);
  }
  if (payload.insights?.length) {
    ws.addRow([]);
    ws.addRow(['Insights']).font = { bold: true };
    for (const s of payload.insights) ws.addRow([s]);
  }
  return ws;
}

async function streamWorkbook(reportId, tenantId, userId, filters, res) {
  const payload = await reportingService.buildReport(reportId, tenantId, userId, filters || {});
  if (!payload) return false;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Mount Olive SMS';
  wb.created = new Date();
  const sheets = await detailSheets(reportId, tenantId, userId, filters || {});
  // Put the detailed data tabs first (many viewers only show the first sheet),
  // and keep the Summary (KPIs/charts) as the last tab.
  for (const s of sheets) addSheet(wb, s);
  payload.tableCount = sheets.length;
  addSummary(wb, payload);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${reportId}-report.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
  return true;
}

async function listTables(reportId, tenantId, userId, filters) {
  return detailSheets(reportId, tenantId, userId, filters || {});
}

module.exports = { streamWorkbook, listTables, streamNamedWorkbook };
