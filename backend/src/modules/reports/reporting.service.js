const db = require('../../config/database');

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const num = (v) => Number(v) || 0;
const delta = (c, p) => (p > 0 ? Math.round(((c - p) / p) * 1000) / 10 : (c > 0 ? 100 : 0));
const round = (v) => (v == null ? null : Math.round(num(v) * 10) / 10);

function resolveRange({ from, to, days = 29 } = {}) {
  const end = to ? new Date(`${to}T00:00:00Z`) : new Date();
  const start = from ? new Date(`${from}T00:00:00Z`) : new Date(end.getTime() - days * 864e5);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const span = end - start + 864e5;
  const prevEnd = new Date(start.getTime() - 864e5);
  const prevStart = new Date(prevEnd.getTime() - span + 864e5);
  return { s: fmt(start), e: fmt(end), ps: fmt(prevStart), pe: fmt(prevEnd) };
}

// role -> visible reports
const CATALOG = [
  { id: 'overview', title: 'School Overview', category: 'School', roles: ['admin', 'owner', 'general_manager', 'principal', 'vice_principal', 'quality_director'] },
  { id: 'academics', title: 'Academic Performance', category: 'Academics', roles: ['admin', 'owner', 'general_manager', 'principal', 'vice_principal', 'quality_director', 'teacher'] },
  { id: 'attendance', title: 'Attendance', category: 'Academics', roles: ['admin', 'owner', 'general_manager', 'principal', 'vice_principal', 'quality_director', 'teacher'] },
  { id: 'finance', title: 'Finance', category: 'Finance', roles: ['admin', 'owner', 'general_manager', 'finance', 'accountant'] },
  { id: 'cashier', title: 'Collections', category: 'Finance', roles: ['admin', 'owner', 'cashier', 'finance'] },
  { id: 'hr', title: 'Staff & HR', category: 'People', roles: ['admin', 'owner', 'general_manager', 'hr'] },
  { id: 'quality', title: 'Quality Assurance', category: 'People', roles: ['admin', 'owner', 'quality_director', 'principal', 'vice_principal'] },
  { id: 'operations', title: 'Operations & Assets', category: 'Operations', roles: ['admin', 'owner', 'general_manager', 'general_services'] },
  { id: 'security', title: 'Security', category: 'Operations', roles: ['admin', 'owner', 'security_head', 'general_manager', 'principal'] },
  { id: 'shifts', title: 'Shifts & Coverage', category: 'Operations', roles: ['admin', 'owner', 'shift_coordinator', 'principal', 'vice_principal', 'quality_director'] },
  { id: 'teacher', title: 'My Teaching', category: 'My Reports', roles: ['teacher'] },
  { id: 'student', title: 'My Progress', category: 'My Reports', roles: ['student'] },
  { id: 'parent', title: 'My Children', category: 'My Reports', roles: ['parent'] },
];

function catalogFor(role) {
  return CATALOG.filter((r) => r.roles.includes(role));
}

// ── shared query helpers ──
async function attendanceRate(tenantId, f, t) {
  const rows = await db('attendance').where({ tenant_id: tenantId }).whereBetween('date', [f, t])
    .groupBy('status').select('status').count('* as c');
  let present = 0, total = 0;
  for (const r of rows) { const c = num(r.c); total += c; if (['present', 'late'].includes(String(r.status).toLowerCase())) present += c; }
  return { rate: pct(present, total), total, present };
}
async function collected(tenantId, f, t) {
  const r = await db('payments').where({ tenant_id: tenantId }).whereBetween('paid_date', [f, t]).sum('amount_paid as v').first();
  return num(r?.v);
}
async function avgScore(tenantId, f, t) {
  const r = await db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id')
    .where('ex.tenant_id', tenantId).whereBetween('ex.date', [f, t])
    .whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0)
    .select(db.raw('AVG(g.marks_obtained / ex.total_marks * 100) as v')).first();
  return round(r?.v);
}

// ── builders ──
async function overview(tenantId, f) {
  const { s, e, ps, pe } = resolveRange(f);
  const [students, staff, classes, outstanding, attC, attP, colC, colP, scC, scP, byGrade, attGrade, collTrend, bands, staffRole] = await Promise.all([
    db('students').where({ tenant_id: tenantId, status: 'active' }).count('* as c').first(),
    db('users').where({ tenant_id: tenantId }).whereNotIn('role', ['student', 'parent']).whereNot('status', 'inactive').count('* as c').first(),
    db('classes').where({ tenant_id: tenantId }).count('* as c').first(),
    db('student_monthly_bills').where({ tenant_id: tenantId, status: 'unpaid' }).select(db.raw('COALESCE(SUM(amount + penalty - amount_paid),0) as v')).first(),
    attendanceRate(tenantId, s, e), attendanceRate(tenantId, ps, pe), collected(tenantId, s, e), collected(tenantId, ps, pe), avgScore(tenantId, s, e), avgScore(tenantId, ps, pe),
    db('classes').where({ 'classes.tenant_id': tenantId }).leftJoin('students', 'classes.id', 'students.class_id').where(function () { this.whereNull('students.id').orWhere('students.status', 'active'); }).groupBy('classes.grade_level').select('classes.grade_level as grade').count('students.id as c').orderBy('classes.grade_level'),
    db('attendance').where({ 'attendance.tenant_id': tenantId }).whereBetween('attendance.date', [s, e]).join('students', 'attendance.student_id', 'students.id').join('classes', 'students.class_id', 'classes.id').groupBy('classes.grade_level').select('classes.grade_level as grade').select(db.raw("count(*) filter (where lower(attendance.status) in ('present','late')) as present")).select(db.raw('count(*) as total')).orderBy('classes.grade_level'),
    db('payments').where({ tenant_id: tenantId }).whereBetween('paid_date', [s, e]).groupByRaw("to_char(paid_date,'YYYY-MM')").select(db.raw("to_char(paid_date,'YYYY-MM') as m")).sum('amount_paid as v').orderBy('m'),
    db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id').where('ex.tenant_id', tenantId).whereBetween('ex.date', [s, e]).whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0).select(db.raw("CASE WHEN g.marks_obtained/ex.total_marks>=0.9 THEN 'A' WHEN g.marks_obtained/ex.total_marks>=0.8 THEN 'B' WHEN g.marks_obtained/ex.total_marks>=0.7 THEN 'C' WHEN g.marks_obtained/ex.total_marks>=0.6 THEN 'D' ELSE 'F' END as band")).count('* as c').groupBy('band'),
    db('users').where({ tenant_id: tenantId }).whereNotIn('role', ['student', 'parent']).whereNot('status', 'inactive').groupBy('role').select('role').count('* as c').orderBy('c', 'desc'),
  ]);
  const insights = [];
  if (attC.rate > 0 && attC.rate < 90) insights.push(`Attendance is ${attC.rate}% — below the 90% target.`);
  else if (attC.rate >= 90) insights.push(`Attendance is healthy at ${attC.rate}%.`);
  const out = num(outstanding?.v);
  if (out > 0) insights.push(`Outstanding fees total ${Math.round(out).toLocaleString()} ETB.`);
  if (num(staff?.c) > 0) insights.push(`Student-to-staff ratio is about ${Math.round(num(students.c) / num(staff.c))}:1.`);
  return {
    kpis: {
      students: { label: 'Active students', value: num(students.c) },
      attendance_rate: { label: 'Attendance rate', value: attC.rate, unit: '%', delta: delta(attC.rate, attP.rate) },
      collected: { label: 'Fees collected', value: colC, unit: 'ETB', delta: delta(colC, colP) },
      outstanding: { label: 'Outstanding fees', value: out, unit: 'ETB' },
      avg_score: { label: 'Average score', value: scC, unit: '%', delta: scC != null && scP != null ? delta(scC, scP) : null },
      staff: { label: 'Staff', value: num(staff.c) },
      classes: { label: 'Classes', value: num(classes.c) },
    },
    sections: [
      { type: 'bar', title: 'Enrollment by grade', data: byGrade.map((r) => ({ label: `G${r.grade}`, value: num(r.c) })) },
      { type: 'bar', title: 'Attendance rate by grade', color: '#7fb3a0', suffix: '%', data: attGrade.map((r) => ({ label: `G${r.grade}`, value: pct(num(r.present), num(r.total)) })) },
      { type: 'line', title: 'Fee collection trend (ETB)', data: collTrend.map((r) => ({ label: r.m, value: num(r.v) })) },
      { type: 'donut', title: 'Grade distribution', caption: 'results', data: bands.map((r) => ({ label: r.band, value: num(r.c) })) },
      { type: 'progress', title: 'Staff by role', data: staffRole.map((r) => ({ label: r.role, value: num(r.c) })) },
    ],
    insights,
  };
}

async function academics(tenantId, f) {
  const { s, e } = resolveRange(f);
  const [bands, bySubject, topClasses, passRow] = await Promise.all([
    db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id').where('ex.tenant_id', tenantId).whereBetween('ex.date', [s, e]).whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0).select(db.raw("CASE WHEN g.marks_obtained/ex.total_marks>=0.9 THEN 'A' WHEN g.marks_obtained/ex.total_marks>=0.8 THEN 'B' WHEN g.marks_obtained/ex.total_marks>=0.7 THEN 'C' WHEN g.marks_obtained/ex.total_marks>=0.6 THEN 'D' ELSE 'F' END as band")).count('* as c').groupBy('band'),
    db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id').join('subjects as sub', 'ex.subject_id', 'sub.id').where('ex.tenant_id', tenantId).whereBetween('ex.date', [s, e]).whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0).groupBy('sub.name').select('sub.name').select(db.raw('AVG(g.marks_obtained/ex.total_marks*100) as avg')).orderBy('avg', 'desc'),
    db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id').join('classes as c', 'ex.class_id', 'c.id').where('ex.tenant_id', tenantId).whereBetween('ex.date', [s, e]).whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0).groupBy('c.name').select('c.name').select(db.raw('AVG(g.marks_obtained/ex.total_marks*100) as avg')).orderBy('avg', 'desc').limit(10),
    db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id').where('ex.tenant_id', tenantId).whereBetween('ex.date', [s, e]).whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0).select(db.raw("count(*) filter (where g.marks_obtained/ex.total_marks>=0.5) as passed")).select(db.raw('count(*) as total')).first(),
  ]);
  const avg = await avgScore(tenantId, s, e);
  const passRate = pct(num(passRow?.passed), num(passRow?.total));
  const [csRows, subjPass] = await Promise.all([
    db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id').join('classes as c', 'ex.class_id', 'c.id').join('subjects as sub', 'ex.subject_id', 'sub.id')
      .where('ex.tenant_id', tenantId).whereBetween('ex.date', [s, e]).whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0)
      .groupBy('c.name', 'sub.name').select('c.name as cls', 'sub.name as sub').select(db.raw('AVG(g.marks_obtained/ex.total_marks*100) as avg')).catch(() => []),
    db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id').join('subjects as sub', 'ex.subject_id', 'sub.id')
      .where('ex.tenant_id', tenantId).whereBetween('ex.date', [s, e]).whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0)
      .groupBy('sub.name').select('sub.name').select(db.raw("count(*) filter (where g.marks_obtained/ex.total_marks>=0.5) as passed")).select(db.raw('count(*) as total')).catch(() => []),
  ]);
  const heatRows = [...new Set(csRows.map((r) => r.cls))];
  const heatCols = [...new Set(csRows.map((r) => r.sub))];
  const heatData = heatRows.map((cls) => heatCols.map((sub) => { const m = csRows.find((r) => r.cls === cls && r.sub === sub); return m ? round(m.avg) : null; }));
  const insights = [];
  if (bySubject.length) insights.push(`Strongest subject: ${bySubject[0].name} (${round(bySubject[0].avg)}%).`);
  if (bySubject.length > 1) insights.push(`Weakest subject: ${bySubject[bySubject.length - 1].name} (${round(bySubject[bySubject.length - 1].avg)}%).`);
  return {
    kpis: {
      avg_score: { label: 'Average score', value: avg, unit: '%' },
      pass_rate: { label: 'Pass rate', value: passRate, unit: '%' },
      exams_graded: { label: 'Results recorded', value: num(passRow?.total) },
    },
    sections: [
      { type: 'donut', title: 'Grade distribution', caption: 'results', data: bands.map((r) => ({ label: r.band, value: num(r.c) })) },
      { type: 'bar', title: 'Average by subject (%)', suffix: '%', data: bySubject.map((r) => ({ label: r.name, value: round(r.avg) })) },
      { type: 'bar', title: 'Top classes (%)', color: '#7fb3a0', suffix: '%', data: topClasses.map((r) => ({ label: r.name, value: round(r.avg) })) },
      { type: 'bar', title: 'Pass rate by subject (%)', color: '#6a8fd4', suffix: '%', data: subjPass.map((r) => ({ label: r.name, value: pct(num(r.passed), num(r.total)) })) },
      { type: 'heatmap', title: 'Class × Subject average (%)', rows: heatRows, cols: heatCols, data: heatData },
    ],
    insights,
  };
}

async function attendance(tenantId, f) {
  const { s, e, ps, pe } = resolveRange(f);
  const [cur, prev, byGrade, byClass, trend, chronic] = await Promise.all([
    attendanceRate(tenantId, s, e), attendanceRate(tenantId, ps, pe),
    db('attendance').where({ 'attendance.tenant_id': tenantId }).whereBetween('attendance.date', [s, e]).join('students', 'attendance.student_id', 'students.id').join('classes', 'students.class_id', 'classes.id').groupBy('classes.grade_level').select('classes.grade_level as grade').select(db.raw("count(*) filter (where lower(attendance.status) in ('present','late')) as p")).select(db.raw('count(*) as t')).orderBy('classes.grade_level'),
    db('attendance').where({ 'attendance.tenant_id': tenantId }).whereBetween('attendance.date', [s, e]).join('students', 'attendance.student_id', 'students.id').join('classes', 'students.class_id', 'classes.id').groupBy('classes.name').select('classes.name').select(db.raw("count(*) filter (where lower(attendance.status) in ('present','late')) as p")).select(db.raw('count(*) as t')).orderBy('classes.name'),
    db('attendance').where({ tenant_id: tenantId }).whereBetween('date', [s, e]).groupByRaw("to_char(date,'YYYY-MM-DD')").select(db.raw("to_char(date,'YYYY-MM-DD') as d")).select(db.raw("count(*) filter (where lower(status) in ('present','late')) as p")).select(db.raw('count(*) as t')).orderBy('d'),
    db('attendance').where({ tenant_id: tenantId }).whereBetween('date', [s, e]).groupBy('student_id').select('student_id').select(db.raw('count(*) as t')).select(db.raw("count(*) filter (where lower(status)='absent') as a")).havingRaw('count(*) >= 3'),
  ]);
  const chronicCount = chronic.filter((r) => num(r.t) > 0 && num(r.a) / num(r.t) > 0.1).length;
  const [chronicList, weekday] = await Promise.all([
    db('attendance as a').join('students as st', 'a.student_id', 'st.id').join('users as u', 'st.user_id', 'u.id').join('classes as c', 'st.class_id', 'c.id')
      .where('a.tenant_id', tenantId).whereBetween('a.date', [s, e]).groupBy('u.first_name', 'u.last_name', 'c.name')
      .select(db.raw("u.first_name || ' ' || u.last_name as name"), 'c.name as class')
      .select(db.raw('count(*) as days')).select(db.raw("count(*) filter (where lower(a.status)='absent') as absent"))
      .havingRaw("count(*) filter (where lower(a.status)='absent') > 0").orderBy('absent', 'desc').limit(15).catch(() => []),
    db('attendance').where({ tenant_id: tenantId }).whereBetween('date', [s, e]).groupByRaw("to_char(date,'Dy'), extract(dow from date)")
      .select(db.raw("to_char(date,'Dy') as d")).select(db.raw("count(*) filter (where lower(status)='absent') as a")).orderByRaw('extract(dow from date)').catch(() => []),
  ]);
  return {
    kpis: {
      attendance_rate: { label: 'Attendance rate', value: cur.rate, unit: '%', delta: delta(cur.rate, prev.rate) },
      days_recorded: { label: 'Records', value: cur.total },
      chronic: { label: 'At-risk students (>10% absent)', value: chronicCount },
    },
    sections: [
      { type: 'line', title: 'Daily attendance rate (%)', data: trend.map((r) => ({ label: r.d, value: pct(num(r.p), num(r.t)) })) },
      { type: 'bar', title: 'By grade (%)', color: '#7fb3a0', suffix: '%', data: byGrade.map((r) => ({ label: `G${r.grade}`, value: pct(num(r.p), num(r.t)) })) },
      { type: 'bar', title: 'By class (%)', suffix: '%', data: byClass.map((r) => ({ label: r.name, value: pct(num(r.p), num(r.t)) })) },
      { type: 'bar', title: 'Absences by weekday', color: '#d47a6a', data: weekday.map((r) => ({ label: r.d, value: num(r.a) })) },
      { type: 'table', title: 'Students with most absences', columns: [{ key: 'name', label: 'Student' }, { key: 'class', label: 'Class' }, { key: 'absent', label: 'Absences' }, { key: 'rate', label: 'Absent %' }], data: chronicList.map((r) => ({ name: r.name, class: r.class, absent: num(r.absent), rate: pct(num(r.absent), num(r.days)) })) },
    ],
    insights: cur.rate < 90 ? [`Attendance is ${cur.rate}% — below target.`] : [`Attendance is ${cur.rate}%.`],
  };
}

async function finance(tenantId, f) {
  const { s, e, ps, pe } = resolveRange(f);
  const [colC, colP, outRow, trend, byClass, expByCat] = await Promise.all([
    collected(tenantId, s, e), collected(tenantId, ps, pe),
    db('student_monthly_bills').where({ tenant_id: tenantId, status: 'unpaid' }).select(db.raw('COALESCE(SUM(amount+penalty-amount_paid),0) as v')).first(),
    db('payments').where({ tenant_id: tenantId }).whereBetween('paid_date', [s, e]).groupByRaw("to_char(paid_date,'YYYY-MM')").select(db.raw("to_char(paid_date,'YYYY-MM') as m")).sum('amount_paid as v').orderBy('m'),
    db('payments as p').join('students as st', 'p.student_id', 'st.user_id').join('classes as c', 'st.class_id', 'c.id').where('p.tenant_id', tenantId).whereBetween('p.paid_date', [s, e]).groupBy('c.name').select('c.name').sum('p.amount_paid as v').orderBy('v', 'desc').limit(10),
    db('expenses').where({ tenant_id: tenantId }).whereBetween('expense_date', [s, e]).groupBy('category').select('category').sum('amount as v').orderBy('v', 'desc').catch(() => []),
  ]);
  const out = num(outRow?.v);
  const [agingRows, outByClass, debtors] = await Promise.all([
    db('student_monthly_bills').where({ tenant_id: tenantId, status: 'unpaid' })
      .select(db.raw("CASE WHEN now()-created_at <= interval '30 days' THEN '0-30 days' WHEN now()-created_at <= interval '60 days' THEN '31-60 days' WHEN now()-created_at <= interval '90 days' THEN '61-90 days' ELSE '90+ days' END as bucket"))
      .sum(db.raw('amount + penalty - amount_paid as v')).groupBy('bucket').catch(() => []),
    db('student_monthly_bills as b').join('students as st', 'b.student_id', 'st.id').join('classes as c', 'st.class_id', 'c.id')
      .where('b.tenant_id', tenantId).where('b.status', 'unpaid').groupBy('c.name').select('c.name').sum(db.raw('amount + penalty - amount_paid as v')).orderBy('v', 'desc').limit(12).catch(() => []),
    db('student_monthly_bills as b').join('students as st', 'b.student_id', 'st.id').join('users as u', 'st.user_id', 'u.id').join('classes as c', 'st.class_id', 'c.id')
      .where('b.tenant_id', tenantId).where('b.status', 'unpaid').groupBy('u.first_name', 'u.last_name', 'c.name')
      .select(db.raw("u.first_name || ' ' || u.last_name as name"), 'c.name as class').sum(db.raw('amount + penalty - amount_paid as v')).orderBy('v', 'desc').limit(10).catch(() => []),
  ]);
  const AGE_ORDER = { '0-30 days': 0, '31-60 days': 1, '61-90 days': 2, '90+ days': 3 };
  agingRows.sort((a, b) => AGE_ORDER[a.bucket] - AGE_ORDER[b.bucket]);
  return {
    kpis: {
      collected: { label: 'Collected', value: colC, unit: 'ETB', delta: delta(colC, colP) },
      outstanding: { label: 'Outstanding', value: out, unit: 'ETB' },
      avg_payment: { label: 'Avg per payment', value: colC > 0 ? Math.round(colC) : 0, unit: 'ETB' },
    },
    sections: [
      { type: 'line', title: 'Collection trend (ETB)', data: trend.map((r) => ({ label: r.m, value: num(r.v) })) },
      { type: 'bar', title: 'Collected by class (ETB)', data: byClass.map((r) => ({ label: r.name, value: num(r.v) })) },
      { type: 'bar', title: 'Expenses by category (ETB)', color: '#d47a6a', data: (expByCat || []).map((r) => ({ label: r.category || 'Other', value: num(r.v) })) },
      { type: 'bar', title: 'Receivables aging (ETB)', color: '#c9a86a', data: agingRows.map((r) => ({ label: r.bucket, value: num(r.v) })) },
      { type: 'bar', title: 'Outstanding by class (ETB)', color: '#8f9bb3', data: outByClass.map((r) => ({ label: r.name, value: num(r.v) })) },
      { type: 'table', title: 'Top outstanding balances', columns: [{ key: 'name', label: 'Student' }, { key: 'class', label: 'Class' }, { key: 'value', label: 'Due (ETB)' }], data: debtors.map((r) => ({ name: r.name, class: r.class, value: num(r.v) })) },
    ],
    insights: out > 0 ? [`Outstanding fees total ${Math.round(out).toLocaleString()} ETB.`] : ['No outstanding fees recorded.'],
  };
}

async function cashier(tenantId, f) {
  const { s, e } = resolveRange(f);
  const [today, range, byMethod, recent] = await Promise.all([
    collected(tenantId, s, s),
    collected(tenantId, s, e),
    db('payments').where({ tenant_id: tenantId }).whereBetween('paid_date', [s, e]).groupBy('payment_method').select('payment_method').sum('amount_paid as v'),
    db('payments').where({ tenant_id: tenantId }).whereBetween('paid_date', [s, e]).count('* as c').first(),
  ]);
  return {
    kpis: {
      collected_range: { label: 'Collected (range)', value: range, unit: 'ETB' },
      receipts: { label: 'Receipts', value: num(recent?.c) },
      today: { label: 'First-day total', value: today, unit: 'ETB' },
    },
    sections: [
      { type: 'donut', title: 'By payment method', caption: 'ETB', data: byMethod.map((r) => ({ label: r.payment_method || 'cash', value: num(r.v) })) },
      { type: 'line', title: 'Daily collections (ETB)', data: (await db('payments').where({ tenant_id: tenantId }).whereBetween('paid_date', [s, e]).groupByRaw("to_char(paid_date,'YYYY-MM-DD')").select(db.raw("to_char(paid_date,'YYYY-MM-DD') as d")).sum('amount_paid as v').orderBy('d')).map((r) => ({ label: r.d, value: num(r.v) })) },
    ],
    insights: [],
  };
}

async function hr(tenantId) {
  const [byRole, byQual, joinTrend, coverage, assigned] = await Promise.all([
    db('users').where({ tenant_id: tenantId }).whereNotIn('role', ['student', 'parent']).whereNot('status', 'inactive').groupBy('role').select('role').count('* as c').orderBy('c', 'desc'),
    db('users').where({ tenant_id: tenantId }).whereNotIn('role', ['student', 'parent']).whereNotNull('qualification').whereNot('qualification', '').groupBy('qualification').select('qualification').count('* as c').orderBy('c', 'desc').limit(10),
    db('users').where({ tenant_id: tenantId }).whereNotIn('role', ['student', 'parent']).whereNotNull('joined_at').groupByRaw("to_char(joined_at,'YYYY')").select(db.raw("to_char(joined_at,'YYYY') as y")).count('* as c').orderBy('y'),
    db('users as u').where({ role: 'teacher' }).whereNotExists(function () { this.select('*').from('teacher_subjects as ts').whereRaw('ts.teacher_id=u.id'); }).count('* as c').first(),
    db('teacher_subjects').countDistinct('teacher_id as c').first(),
  ]);
  const totalStaff = byRole.reduce((s, r) => s + num(r.c), 0);
  return {
    kpis: {
      staff: { label: 'Total staff', value: totalStaff },
      teachers: { label: 'Teachers', value: num((byRole.find((r) => r.role === 'teacher') || {}).c) },
      unassigned: { label: 'Teachers w/o assignment', value: num(coverage?.c) },
      assigned: { label: 'Teachers with assignment', value: num(assigned?.c) },
    },
    sections: [
      { type: 'progress', title: 'Staff by role', data: byRole.map((r) => ({ label: r.role, value: num(r.c) })) },
      { type: 'bar', title: 'Joining trend', data: joinTrend.map((r) => ({ label: r.y, value: num(r.c) })) },
      { type: 'bar', title: 'Qualification mix', color: '#8f9bb3', data: byQual.map((r) => ({ label: r.qualification, value: num(r.c) })) },
    ],
    insights: num(coverage?.c) > 0 ? [`${coverage.c} teachers have no subject/class assignment.`] : ['All teachers have assignments.'],
  };
}

async function quality(tenantId) {
  const [syllabus, feedback, subsCount] = await Promise.all([
    db('teacher_kpi_metrics').where({ tenant_id: tenantId }).select(db.raw('AVG(syllabus_completion_rate) as v')).first().catch(() => null),
    db('teacher_kpi_metrics').where({ tenant_id: tenantId }).select(db.raw('AVG(student_feedback_score) as v')).first().catch(() => null),
    db('teacher_substitutions').where({ tenant_id: tenantId }).count('* as c').first().catch(() => null),
  ]);
  return {
    kpis: {
      syllabus: { label: 'Avg syllabus completion', value: round(syllabus?.v), unit: '%' },
      feedback: { label: 'Avg student feedback', value: round(feedback?.v) },
      substitutions: { label: 'Substitutions', value: num(subsCount?.c) },
    },
    sections: [],
    insights: [],
  };
}

async function operations(tenantId) {
  const [byCat, byStatus, maint, byLoc] = await Promise.all([
    db('school_assets').where({ tenant_id: tenantId }).groupBy('category').select('category').count('* as c').orderBy('c', 'desc').catch(() => []),
    db('school_assets').where({ tenant_id: tenantId }).groupBy('status').select('status').count('* as c').catch(() => []),
    db('maintenance_requests').where({ tenant_id: tenantId }).groupBy('status').select('status').count('* as c').catch(() => []),
    db('school_assets').where({ tenant_id: tenantId }).groupBy('location').select('location').count('* as c').orderBy('c', 'desc').limit(10).catch(() => []),
  ]);
  const total = (byCat || []).reduce((s, r) => s + num(r.c), 0);
  return {
    kpis: { assets: { label: 'Assets', value: total }, categories: { label: 'Categories', value: (byCat || []).length } },
    sections: [
      { type: 'progress', title: 'Assets by category', data: (byCat || []).map((r) => ({ label: r.category || 'Other', value: num(r.c) })) },
      { type: 'donut', title: 'Assets by status', caption: 'assets', data: (byStatus || []).map((r) => ({ label: r.status || 'Unknown', value: num(r.c) })) },
      { type: 'bar', title: 'Assets by location', data: (byLoc || []).map((r) => ({ label: r.location || 'Unassigned', value: num(r.c) })) },
    ],
    insights: (maint || []).length ? [`Maintenance: ${(maint || []).map((m) => `${m.status}: ${m.c}`).join(', ')}`] : [],
  };
}

async function security(tenantId, f) {
  const { s, e } = resolveRange(f);
  const [visitors, incidents, gate, bySeverity] = await Promise.all([
    db('visitor_logs').where({ tenant_id: tenantId }).whereBetween('time_in', [s, e]).count('* as c').first().catch(() => null),
    db('campus_incidents').where({ tenant_id: tenantId }).whereBetween('incident_date', [s, e]).count('* as c').first().catch(() => null),
    db('student_gate_passes').where({ tenant_id: tenantId }).whereBetween('departure_date', [s, e]).count('* as c').first().catch(() => null),
    db('campus_incidents').where({ tenant_id: tenantId }).whereBetween('incident_date', [s, e]).groupBy('severity').select('severity').count('* as c').catch(() => []),
  ]);
  return {
    kpis: {
      visitors: { label: 'Visitors', value: num(visitors?.c) },
      incidents: { label: 'Incidents', value: num(incidents?.c) },
      gate_passes: { label: 'Gate passes', value: num(gate?.c) },
    },
    sections: [
      { type: 'donut', title: 'Incidents by severity', caption: 'incidents', data: (bySeverity || []).map((r) => ({ label: r.severity || 'Unknown', value: num(r.c) })) },
    ],
    insights: [],
  };
}

async function shifts(tenantId, f) {
  const { s, e } = resolveRange(f);
  const [subs, byReason] = await Promise.all([
    db('teacher_substitutions').where({ tenant_id: tenantId }).whereBetween('date', [s, e]).count('* as c').first().catch(() => null),
    db('teacher_substitutions').where({ tenant_id: tenantId }).whereBetween('date', [s, e]).groupBy('reason').select('reason').count('* as c').catch(() => []),
  ]);
  return {
    kpis: { substitutions: { label: 'Substitutions', value: num(subs?.c) } },
    sections: [{ type: 'donut', title: 'Substitutions by reason', caption: 'cases', data: (byReason || []).map((r) => ({ label: r.reason || 'Other', value: num(r.c) })) }],
    insights: [],
  };
}

async function teacherReport(tenantId, f, userId) {
  const { s, e } = resolveRange(f);
  const classes = await db('teacher_subjects').where({ teacher_id: userId }).countDistinct('class_id as c').first();
  const subjects = await db('teacher_subjects').where({ teacher_id: userId }).countDistinct('subject_id as c').first();
  const [bands, att] = await Promise.all([
    db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id').join('teacher_subjects as ts', function () { this.on('ts.class_id', '=', 'ex.class_id').andOn('ts.subject_id', '=', 'ex.subject_id'); }).where('ts.teacher_id', userId).whereBetween('ex.date', [s, e]).whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0).select(db.raw("CASE WHEN g.marks_obtained/ex.total_marks>=0.9 THEN 'A' WHEN g.marks_obtained/ex.total_marks>=0.8 THEN 'B' WHEN g.marks_obtained/ex.total_marks>=0.7 THEN 'C' WHEN g.marks_obtained/ex.total_marks>=0.6 THEN 'D' ELSE 'F' END as band")).count('* as c').groupBy('band'),
    db('attendance').where({ tenant_id: tenantId }).whereBetween('date', [s, e]).select(db.raw('count(*) filter (where lower(status) in (\'present\',\'late\')) as p')).select(db.raw('count(*) as t')).first(),
  ]);
  return {
    kpis: {
      classes: { label: 'Classes I teach', value: num(classes?.c) },
      subjects: { label: 'Subjects', value: num(subjects?.c) },
      attendance: { label: 'Attendance (school)', value: pct(num(att?.p), num(att?.t)), unit: '%' },
    },
    sections: [{ type: 'donut', title: 'Grade distribution (my classes)', caption: 'results', data: bands.map((r) => ({ label: r.band, value: num(r.c) })) }],
    insights: [],
  };
}

async function studentReport(tenantId, f, userId) {
  const { s, e } = resolveRange(f);
  const student = await db('students').where({ tenant_id: tenantId, user_id: userId }).first();
  if (!student) return { kpis: {}, sections: [], insights: [] };
  const [att, grades] = await Promise.all([
    db('attendance').where({ student_id: student.id }).whereBetween('date', [s, e]).select(db.raw("count(*) filter (where lower(status) in ('present','late')) as p")).select(db.raw('count(*) as t')).first(),
    db('grades as g').join('exams as ex', 'g.exam_id', 'ex.id').where('g.student_id', student.id).whereBetween('ex.date', [s, e]).whereNotNull('g.marks_obtained').where('ex.total_marks', '>', 0).select(db.raw('AVG(g.marks_obtained/ex.total_marks*100) as avg')).first(),
  ]);
  return {
    kpis: {
      attendance: { label: 'My attendance', value: pct(num(att?.p), num(att?.t)), unit: '%' },
      average: { label: 'My average', value: round(grades?.avg), unit: '%' },
    },
    sections: [],
    insights: [],
  };
}

async function parentReport(tenantId, f, userId) {
  const { s, e } = resolveRange(f);
  const children = await db('student_parents as sp').join('students as st', 'sp.student_id', 'st.id').where('sp.parent_id', userId).select('st.id', 'st.class_id');
  return {
    kpis: { children: { label: 'My children', value: children.length } },
    sections: [],
    insights: [],
  };
}

const BUILDERS = {
  overview, academics, attendance, finance, cashier, hr, quality, operations, security, shifts,
  teacher: teacherReport, student: studentReport, parent: parentReport,
};

async function buildReport(reportId, tenantId, userId, filters = {}) {
  const builder = BUILDERS[reportId];
  if (!builder) return null;
  const data = await builder(tenantId, filters, userId);
  const title = (CATALOG.find((c) => c.id === reportId) || {}).title || reportId;
  const r = resolveRange(filters);
  return { reportId, title, period: { from: r.s, to: r.e }, ...data };
}

module.exports = { buildReport, catalogFor, CATALOG };
