const PDFDocument = require('pdfkit');
const db = require('../config/database');
const { getSemesterResults, getOverviewReport } = require('../modules/reports/reports.service');
const reportingService = require('../modules/reports/reporting.service');

function gradeLetter(score, max) {
  if (score == null || !max || max <= 0) return '-';
  const ratio = score / max;
  return ratio >= 0.9 ? 'A' : ratio >= 0.8 ? 'B' : ratio >= 0.7 ? 'C' : ratio >= 0.6 ? 'D' : 'F';
}

function gpaFromPct(pct) {
  if (pct == null) return null;
  if (pct >= 90) return 4.0;
  if (pct >= 80) return 3.0;
  if (pct >= 70) return 2.0;
  if (pct >= 60) return 1.0;
  return 0.0;
}

async function generateReportCard(tenantId, studentId, academicYear, termId) {
  if (termId) return generateTermReportCard(tenantId, studentId, termId);
  // No term given: default to the current (latest) term so the button always
  // produces the real, designed report card rather than the legacy card.
  const latestTerm = await db('terms')
    .where({ tenant_id: tenantId })
    .orderBy('end_date', 'desc')
    .first();
  if (latestTerm) return generateTermReportCard(tenantId, studentId, latestTerm.id);

  const student = await db('students')
    .where({ 'students.tenant_id': tenantId, 'students.user_id': studentId })
    .leftJoin('users', 'students.user_id', 'users.id')
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select('students.*', 'users.first_name', 'users.last_name', 'classes.name as class_name')
    .first();
  if (!student) throw new Error('NOT_FOUND');

  const tenant = await db('tenants').where({ id: tenantId }).select('name').first();
  const schoolName = tenant?.name || 'School';

  const guardians = await db('student_parents')
    .where({ 'student_parents.tenant_id': tenantId, 'student_parents.student_id': student.id })
    .leftJoin('users', 'student_parents.parent_id', 'users.id')
    .select(
      'student_parents.relationship', 'student_parents.is_primary', 'student_parents.education_level',
      'users.first_name', 'users.last_name'
    )
    .orderBy('student_parents.is_primary', 'desc');
  const primaryGuardian = guardians.find((g) => g.is_primary) || guardians[0] || null;

  let gradesQuery = db('grades')
    .where({ 'grades.tenant_id': tenantId, 'grades.student_id': studentId })
    .leftJoin('exams', 'grades.exam_id', 'exams.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .leftJoin('terms', 'exams.term_id', 'terms.id')
    .select(
      'subjects.name as subject',
      'grades.marks_obtained',
      'exams.total_marks',
      'exams.name as exam_name',
      'exams.date as exam_date',
      'terms.name as term_name',
      'exams.term_id'
    );

  if (academicYear) {
    gradesQuery = gradesQuery.whereRaw("EXTRACT(YEAR FROM exams.date) = ?", [parseInt(academicYear, 10)]);
  }
  const gradeRows = await gradesQuery.orderBy('exams.date', 'asc');

  const bySubject = {};
  for (const g of gradeRows) {
    if (!bySubject[g.subject]) bySubject[g.subject] = { subject: g.subject, obtained: 0, possible: 0, count: 0 };
    bySubject[g.subject].obtained += parseFloat(g.marks_obtained) || 0;
    bySubject[g.subject].possible += parseFloat(g.total_marks) || 0;
    bySubject[g.subject].count += 1;
  }
  const subjectSummary = Object.values(bySubject).map((s) => ({
    ...s,
    average: s.possible > 0 ? (s.obtained / s.possible) * 100 : null,
  })).sort((a, b) => a.subject.localeCompare(b.subject));

  let obtainedTotal = 0;
  let possibleTotal = 0;
  for (const s of subjectSummary) {
    obtainedTotal += s.obtained;
    possibleTotal += s.possible;
  }
  const overall = possibleTotal > 0 ? (obtainedTotal / possibleTotal) * 100 : null;
  const gpa = gpaFromPct(overall);

  const attRecords = await db('attendance')
    .where({ tenant_id: tenantId, student_id: studentId })
    .select('status')
    .count('* as count')
    .groupBy('status');
  const attTotal = attRecords.reduce((sum, r) => sum + parseInt(r.count, 10), 0);
  const attPresent = parseInt(attRecords.find((r) => r.status === 'present')?.count || 0, 10);
  const attPresentPct = attTotal > 0 ? (attPresent / attTotal) * 100 : null;

  const discipline = await db('student_discipline')
    .where({ tenant_id: tenantId, student_id: student.id })
    .orderBy('created_at', 'desc');

  const termGroups = {};
  for (const g of gradeRows) {
    const key = g.term_name || 'Ungrouped';
    if (!termGroups[key]) termGroups[key] = [];
    termGroups[key].push(g);
  }
  const termOrder = Object.keys(termGroups).sort((a, b) => {
    if (a === 'Ungrouped') return 1;
    if (b === 'Ungrouped') return -1;
    return a.localeCompare(b);
  });

  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on('data', (b) => buffers.push(b));
  doc.on('end', () => {});

  doc.fontSize(18).text('Report Card', { align: 'center' });
  doc.fontSize(10).text(schoolName, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Student: ${[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')}`);
  doc.fontSize(10);
  doc.text(`Class: ${student.class_name || 'N/A'}   |   Student #: ${student.student_number || 'N/A'}`);
  if (primaryGuardian) {
    const rel = primaryGuardian.relationship || 'guardian';
    const edu = primaryGuardian.education_level ? `   |   Education: ${primaryGuardian.education_level}` : '';
    doc.text(`Guardian: ${[primaryGuardian.first_name, primaryGuardian.middle_name, primaryGuardian.last_name].filter(Boolean).join(' ')} (${rel})${edu}`);
  }
  doc.text(`Year: ${academicYear || new Date().getFullYear()}   |   Generated: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').fontSize(11).text('Subject Summary');
  doc.moveDown(0.3);
  doc.fontSize(10);
  doc.text('Subject', 50, doc.y, { width: 200, continued: true });
  doc.text('Exams', 260, doc.y, { width: 50, continued: true });
  doc.text('Average', 320, doc.y, { width: 70, continued: true });
  doc.text('Grade', 400, doc.y);
  doc.moveDown(0.5);
  if (subjectSummary.length === 0) {
    doc.font('Helvetica').text('No grades recorded.', 50, doc.y);
  }
  for (const s of subjectSummary) {
    doc.font('Helvetica');
    doc.text(s.subject, 50, doc.y, { width: 200, continued: true });
    doc.text(`${s.count}`, 260, doc.y, { width: 50, continued: true });
    doc.text(s.average != null ? `${s.average.toFixed(1)}%` : '-', 320, doc.y, { width: 70, continued: true });
    doc.text(s.average != null ? gradeLetter(s.obtained, s.possible) : '-', 400, doc.y);
    doc.moveDown(0.3);
  }
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold');
  doc.text('Overall Average', 50, doc.y, { width: 200, continued: true });
  doc.text(overall != null ? `${overall.toFixed(1)}%` : '-', 320, doc.y, { width: 70, continued: true });
  doc.text(`GPA: ${gpa != null ? gpa.toFixed(1) : '-'}`, 400, doc.y);
  doc.moveDown(0.5);

  doc.font('Helvetica-Bold').fontSize(11).text('Attendance');
  doc.fontSize(10).font('Helvetica');
  doc.moveDown(0.3);
  doc.text(`Total Days Recorded: ${attTotal}   |   Present: ${attPresent}   |   Attendance: ${attPresentPct != null ? `${attPresentPct.toFixed(1)}%` : '-'}`);
  doc.moveDown(0.7);

  for (const term of termOrder) {
    doc.font('Helvetica-Bold').fontSize(11).text(term);
    doc.fontSize(10).font('Helvetica');
    doc.moveDown(0.3);
    doc.text('Exam', 50, doc.y, { width: 180, continued: true });
    doc.text('Subject', 240, doc.y, { width: 120, continued: true });
    doc.text('Score', 370, doc.y, { width: 60, continued: true });
    doc.text('Grade', 440, doc.y);
    doc.moveDown(0.5);
    for (const g of termGroups[term]) {
      const hasScore = g.marks_obtained != null && g.marks_obtained !== '';
      const score = hasScore ? parseFloat(g.marks_obtained) : null;
      const max = g.total_marks != null ? parseFloat(g.total_marks) : null;
      doc.font('Helvetica');
      doc.text(g.exam_name || g.subject || 'Unknown', 50, doc.y, { width: 180, continued: true });
      doc.text(g.subject || 'Unknown', 240, doc.y, { width: 120, continued: true });
      doc.text(score != null ? `${score}/${max != null ? max : '-'}` : '-', 370, doc.y, { width: 60, continued: true });
      doc.text(gradeLetter(score, max), 440, doc.y);
      doc.moveDown(0.3);
    }
    doc.moveDown(0.5);
  }

  doc.font('Helvetica-Bold').fontSize(11).text('Conduct / Discipline');
  doc.fontSize(10).font('Helvetica');
  doc.moveDown(0.3);
  if (discipline.length === 0) {
    doc.text('No discipline records.', 50, doc.y);
  }
  for (const d of discipline) {
    const date = d.created_at ? new Date(d.created_at).toLocaleDateString() : '';
    doc.text(`${date}  [${d.incident_type}] (${d.status})`, 50, doc.y);
    doc.text(d.description || '', 60, doc.y, { width: 430 });
    doc.moveDown(0.4);
  }

  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

async function generateInvoice(tenantId, studentId) {
  const student = await db('students')
    .where({ 'students.tenant_id': tenantId, 'students.user_id': studentId })
    .leftJoin('users', 'students.user_id', 'users.id')
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select('users.first_name', 'users.last_name', 'classes.name as class_name', 'students.class_id')
    .first();
  if (!student) throw new Error('NOT_FOUND');

  const payments = await db('payments').where({ tenant_id: tenantId, student_id: studentId });
  const paymentMap = {};
  let totalPaid = 0;
  for (const p of payments) {
    totalPaid += Number(p.amount_paid || 0);
    if (p.fee_structure_id) {
      paymentMap[p.fee_structure_id] = (paymentMap[p.fee_structure_id] || 0) + Number(p.amount_paid || 0);
    }
  }

  let query = db('fee_structures').where({ tenant_id: tenantId, is_active: true });
  if (student.class_id) {
    query = query.where(function () {
      this.whereNull('class_id').orWhere('class_id', student.class_id);
    });
  } else {
    query = query.whereNull('class_id');
  }
  const structures = await query.orderBy('name');

  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on('data', (b) => buffers.push(b));

  doc.fontSize(20).text('INVOICE', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Student: ${[student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ')}`);
  doc.text(`Class: ${student.class_name || 'N/A'}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  doc.fontSize(10).text('Item', 50, doc.y, { width: 200, continued: true });
  doc.text('Amount', 250, doc.y, { width: 80, continued: true });
  doc.text('Paid', 330, doc.y, { width: 80, continued: true });
  doc.text('Balance', 410, doc.y);
  doc.moveDown(0.5);

  let total = 0;
  for (const f of structures) {
    const paid = paymentMap[f.id] || 0;
    const balance = Math.max(0, Number(f.amount || 0) - paid);
    total += balance;
    doc.text(f.name, 50, doc.y, { width: 200, continued: true });
    doc.text(`${f.amount} ETB`, 250, doc.y, { width: 80, continued: true });
    doc.text(paid ? `${paid} ETB` : '-', 330, doc.y, { width: 80, continued: true });
    doc.text(balance ? `${balance} ETB` : '-', 410, doc.y);
    doc.moveDown(0.3);
  }

  if (structures.length === 0) {
    doc.fontSize(10).text('No active fee structures for this student.', 50, doc.y);
  }

  doc.moveDown();
  doc.fontSize(12).text(`Total Paid: ${totalPaid} ETB`, { align: 'right' });
  doc.text(`Outstanding Balance: ${total} ETB`, { align: 'right' });

  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

async function generatePayslip(tenantId, payrollId) {
  const payroll = await db('payroll')
    .where({ 'payroll.id': payrollId, 'payroll.tenant_id': tenantId })
    .leftJoin('users', 'payroll.user_id', 'users.id')
    .leftJoin('salary_grades', 'payroll.salary_grade_id', 'salary_grades.id')
    .select(
      'payroll.*',
      'users.first_name', 'users.last_name', 'users.job_title',
      'salary_grades.name as grade_name'
    )
    .first();
  if (!payroll) throw new Error('NOT_FOUND');

  const tenant = await db('tenants').where({ id: tenantId }).select('name').first();
  const schoolName = tenant?.name || 'School';

  const fmt = (v) => (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const allowances = [
    ['Transport Allowance', payroll.transport_allowance],
    ['Overtime', payroll.overtime],
    ['Back Pay', payroll.back_pay],
    ['Unit Leader Allowance', payroll.unit_leader_allowance],
    ['Department Head Allowance', payroll.department_head_allowance],
    ['Housing Allowance', payroll.housing_allowance],
    ['Account Allowance', payroll.account_allowance],
    ['Phone Allowance', payroll.phone_allowance],
  ].filter(([, v]) => parseFloat(v) > 0);

  const deductions = [
    ['Income Tax', payroll.income_tax],
    ['School Pay', payroll.school_pay],
    ['Eder', payroll.eder],
    ['Office Loan', payroll.office_loan],
    ['Café Loan', payroll.cafe_loan],
    ['Pension Con. 7%', payroll.pension_employee],
    ['Pension Con. 11%', payroll.pension_employer],
    ['N.E. Starving', payroll.ne_starving],
  ].filter(([, v]) => parseFloat(v) > 0);

  const basic = parseFloat(payroll.basic_pay) || 0;
  const allowancesTotal = parseFloat(payroll.allowances_total) || 0;
  const deductionsTotal = parseFloat(payroll.deductions_total) || 0;
  const gross = basic + allowancesTotal;
  const net = parseFloat(payroll.net_pay) || 0;
  const period = `${monthNames[payroll.month - 1] || payroll.month} ${payroll.year}`;

  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on('data', (b) => buffers.push(b));

  doc.fontSize(16).text('PAYSLIP', { align: 'center' });
  doc.fontSize(12).text(schoolName, { align: 'center' });
  doc.fontSize(9).text(`Payroll Sheet for the Month of ${period}`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(11).text(`Employee: ${[payroll.first_name, payroll.middle_name, payroll.last_name].filter(Boolean).join(' ')}`);
  doc.fontSize(9);
  doc.text(`Job Title: ${payroll.job_title || 'N/A'}   |   Grade: ${payroll.grade_name || 'N/A'}`);
  if (payroll.work_days != null || payroll.absent_days != null) {
    doc.text(`Work Days: ${payroll.work_days ?? '—'}   |   Absent Days: ${payroll.absent_days ?? '—'}`);
  }
  if (payroll.bank_account || payroll.bank_name) {
    doc.text(`Bank: ${payroll.bank_name || 'N/A'}   |   Account: ${payroll.bank_account || '—'}`);
  }
  doc.moveDown();

  const row = (label, value, bold = false) => {
    const y = doc.y;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(label, 50, y, { width: 300 });
    doc.text(value, 420, y, { width: 130, align: 'right' });
    doc.moveDown(0.25);
  };

  doc.font('Helvetica-Bold').fontSize(10).text('EARNINGS', 50, doc.y);
  doc.moveDown(0.25);
  row('Basic Salary', `${fmt(basic)} ETB`);
  for (const [label, v] of allowances) row(label, `${fmt(v)} ETB`);
  row('Gross Earnings', `${fmt(gross)} ETB`, true);

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(10).text('DEDUCTIONS', 50, doc.y);
  doc.moveDown(0.25);
  if (deductions.length === 0) row('No deductions', '—');
  for (const [label, v] of deductions) row(label, `${fmt(v)} ETB`);
  row('Total Deductions', `${fmt(deductionsTotal)} ETB`, true);

  doc.moveDown(0.5);
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Net Pay', 50, y, { width: 300 });
  doc.text(`${fmt(net)} ETB`, 420, y, { width: 130, align: 'right' });
  doc.moveDown(1);
  doc.fontSize(9).font('Helvetica').text(`Net Pay in words: ${net.toLocaleString('en-US')} ETB`, 50, doc.y);

  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}


// Build the report-card payload(s) for a term. Computes per-subject rank too.
async function buildCardPayloads(tenantId, termId, classId, studentUserIds = null) {
  const term = await db('terms').where({ id: termId }).first();
  const termName = term?.name || '—';
  const tenant = await db('tenants').where({ id: tenantId }).select('name').first();
  const academicYear = term?.academic_year_id
    ? await db('academic_years').where({ id: term.academic_year_id }).select('name').first()
    : null;
  const grading = require('../shared/grading');
  const { scale } = await grading.getGradingConfig(tenantId);

  // Students in the class
  let sQ = db('students as s').join('users as u', 's.user_id', 'u.id')
    .where({ 's.tenant_id': tenantId, 's.class_id': classId })
    .select('s.id as record_id', 's.user_id', 's.student_number', 's.status', 's.class_id',
      'u.first_name', 'u.last_name');
  if (studentUserIds && studentUserIds.length) sQ = sQ.whereIn('s.user_id', studentUserIds);
  const students = await sQ;

  const classInfo = await db('classes').where({ id: classId }).first();
  const homeroom = classInfo?.class_teacher_id
    ? await db('users').where({ id: classInfo.class_teacher_id }).select('first_name', 'last_name').first()
    : null;
  const classAdvisor = homeroom ? `${[homeroom.first_name, homeroom.middle_name, homeroom.last_name].filter(Boolean).join(' ')}` : '';

  const results = await getSemesterResults(tenantId, { term_id: termId, class_id: classId });
  const studentCount = results.students.length;

  // subject names + per-subject ranks across the class
  const allSubjectIds = [...new Set(results.students.flatMap((r) => r.subjects.map((s) => s.subject_id)).filter(Boolean))];
  const subjNames = {};
  if (allSubjectIds.length) {
    const subs = await db('subjects').whereIn('id', allSubjectIds).select('id', 'name');
    subs.forEach((s) => { subjNames[s.id] = s.name; });
  }
  const subjRank = {};
  for (const r of results.students) {
    for (const s of r.subjects) {
      const key = s.subject_id;
      if (!key) continue;
      (subjRank[key] = subjRank[key] || []).push({ sid: r.student_id, mark: Number(s.mark || 0) });
    }
  }
  const subjRankMap = {};
  for (const key of Object.keys(subjRank)) {
    subjRank[key].sort((a, b) => b.mark - a.mark);
    subjRank[key].forEach((x, i) => {
      subjRankMap[x.sid] = subjRankMap[x.sid] || {};
      subjRankMap[x.sid][key] = i + 1;
    });
  }

  // attendance + meta per student (batch)
  const userIds = students.map((s) => s.user_id).filter(Boolean);
  const attMap = {};
  if (userIds.length && term) {
    const att = await db('attendance')
      .where({ tenant_id: tenantId }).whereIn('student_id', userIds)
      .whereBetween('date', [term.start_date || '1900-01-01', term.end_date || '2100-01-01'])
      .groupBy('student_id', 'status').count('* as c').select('student_id', 'status');
    for (const a of att) {
      const o = (attMap[a.student_id] = attMap[a.student_id] || { present: 0, absent: 0, late: 0 });
      if (a.status === 'present') o.present += Number(a.c);
      else if (a.status === 'absent') o.absent += Number(a.c);
      else if (a.status === 'late') o.late += Number(a.c);
    }
  }
  const recIds = students.map((s) => s.record_id).filter(Boolean);
  const metaMap = {};
  if (recIds.length) {
    const metas = await db('report_card_meta')
      .where({ tenant_id: tenantId, term_id: termId }).whereIn('student_id', recIds).select('student_id', 'remarks');
    for (const m of metas) metaMap[m.student_id] = m.remarks || '';
  }

  const payloads = [];
  for (const st of students) {
    const mine = results.students.find((r) => r.student_id === st.user_id);
    const subjects = (mine?.subjects || []).map((s) => ({
      name: (s.subject_id && subjNames[s.subject_id]) || s.name || 'Subject',
      ca: s.ca, exam: s.exam, mark: s.mark, letter: s.letter,
      rank: subjRankMap[st.user_id]?.[s.subject_id] || null,
    }));
    const att = attMap[st.user_id] || { present: 0, absent: 0, late: 0 };
    att.totalDays = att.present + att.absent + att.late;
    const failed = subjects.filter((s) => Number(s.mark) < 50).length;
    const promotionLine = st.status !== 'active' ? '' :
      failed === 0 ? 'RESULT: PROMOTED to the next grade.'
      : failed <= 2 ? `RESULT: CONDITIONAL — must improve ${failed} subject(s).`
      : 'RESULT: NOT PROMOTED — repeat current grade.';

    payloads.push({
      __v2: true,
      schoolName: tenant?.name || 'School',
      schoolYear: academicYear?.name || '',
      termLabel: termName,
      reportType: (tenant?.name || 'SCHOOL') && (termName.toUpperCase().includes('QUARTER') ? 'QUARTERLY REPORT' : 'SEMESTER REPORT'),
      studentName: `${st.first_name || ''} ${st.last_name || ''}`.trim(),
      studentNumber: st.student_number,
      className: classInfo?.name || '—',
      gradeLevel: classInfo?.grade_level,
      section: classInfo?.section,
      classAdvisor,
      subjects,
      average: mine?.average ?? 0,
      rank: mine?.rank ?? null,
      studentCount,
      attendance: att,
      comment: metaMap[st.record_id] || '',
      promotionLine,
      scale,
      issuedAt: new Date().toISOString().slice(0, 10),
    });
  }
  // ordered by rank for printing
  payloads.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  return payloads;
}

async function generateTermReportCard(tenantId, studentId, termId) {
  const student = await db('students')
    .where({ 'students.tenant_id': tenantId, 'students.user_id': studentId })
    .first();
  if (!student) throw new Error('NOT_FOUND');
  const payloads = await buildCardPayloads(tenantId, termId, student.class_id, [studentId]);
  const payload = payloads[0] || { __v2: true, schoolName: 'School', subjects: [], attendance: {} };
  const reportCard = require('../shared/report-card');
  return reportCard.generateReportCard(payload, null, payload.attendance, { name: payload.termLabel });
}

// All report cards for a class+term, combined into one printable PDF.
async function generateClassReportCardsPdf(tenantId, classId, termId) {
  const payloads = await buildCardPayloads(tenantId, termId, classId);
  const reportCard = require('../shared/report-card');
  return reportCard.generateCombinedReportCards(payloads);
}

async function generateOverviewPdf(tenantId, { from, to } = {}, res) {
  const data = await getOverviewReport(tenantId, { from, to });
  const tenant = await db('tenants').where({ id: tenantId }).select('name').first();
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(18).fillColor('#111').text(tenant?.name || 'School');
  doc.moveDown(0.2);
  doc.fontSize(13).fillColor('#333').text('School Overview Report');
  doc.fontSize(9).fillColor('#888').text(`Period: ${data.period.from} - ${data.period.to}`);
  doc.moveDown(1);

  doc.fontSize(12).fillColor('#111').text('Key Metrics');
  doc.moveDown(0.4);
  for (const v of Object.values(data.kpis)) {
    const delta = v.delta != null ? `  (${v.delta >= 0 ? '+' : ''}${v.delta}% vs previous)` : '';
    const unit = v.unit ? ` ${v.unit}` : '';
    doc.fontSize(10).fillColor('#222').text(`• ${v.label || ''}: ${v.value ?? '-'}${unit}${delta}`);
  }

  if (data.insights?.length) {
    doc.moveDown(1);
    doc.fontSize(12).fillColor('#111').text('Insights');
    doc.moveDown(0.4);
    for (const s of data.insights) doc.fontSize(10).fillColor('#444').text(`• ${s}`);
  }

  const table = (title, rows, suffix = '') => {
    if (!rows?.length) return;
    doc.moveDown(1);
    doc.fontSize(12).fillColor('#111').text(title);
    doc.moveDown(0.4);
    for (const r of rows) {
      doc.fontSize(10).fillColor('#222').text(`${r.label ?? ''}: ${Number(r.value ?? 0).toLocaleString()}${suffix}`);
    }
  };
  table('Enrollment by grade', data.enrollment_by_grade);
  table('Attendance rate by grade', data.attendance_by_grade, '%');
  table('Fee collection trend (ETB)', data.collection_trend);
  table('Grade distribution', data.grade_distribution);
  table('Staff by role', data.staff_by_role);

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#999').text(`Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
  doc.end();
}

async function generateReportPdf(reportId, tenantId, userId, filters, res) {
  const data = await reportingService.buildReport(reportId, tenantId, userId, filters || {});
  if (!data) return false;
  const tenant = await db('tenants').where({ id: tenantId }).select('name').first();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${reportId}.pdf"`);
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(18).fillColor('#111').text(tenant?.name || 'School');
  doc.moveDown(0.2);
  doc.fontSize(14).fillColor('#333').text(data.title || reportId);
  if (data.period?.from) doc.fontSize(9).fillColor('#888').text(`Period: ${data.period.from} - ${data.period.to}`);
  doc.moveDown(1);

  const kpis = Object.values(data.kpis || {});
  if (kpis.length) {
    doc.fontSize(12).fillColor('#111').text('Key Metrics');
    doc.moveDown(0.4);
    for (const v of kpis) {
      const d = v.delta != null ? `  (${v.delta >= 0 ? '+' : ''}${v.delta}% vs previous)` : '';
      const u = v.unit ? ` ${v.unit}` : '';
      doc.fontSize(10).fillColor('#222').text(`• ${v.label || ''}: ${v.value ?? '-'}${u}${d}`);
    }
  }

  for (const section of data.sections || []) {
    if (!section.data?.length) continue;
    doc.moveDown(1);
    doc.fontSize(12).fillColor('#111').text(section.title || '');
    doc.moveDown(0.4);
    for (const row of section.data.slice(0, 40)) {
      doc.fontSize(10).fillColor('#222').text(`${row.label ?? ''}: ${Number(row.value ?? 0).toLocaleString()}${section.suffix || ''}`);
    }
  }

  if (data.insights?.length) {
    doc.moveDown(1);
    doc.fontSize(12).fillColor('#111').text('Insights');
    doc.moveDown(0.4);
    for (const s of data.insights) doc.fontSize(10).fillColor('#444').text(`• ${s}`);
  }

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#999').text(`Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`);
  doc.end();
  return true;
}

module.exports = { generateReportCard, generateInvoice, generatePayslip, generateOverviewPdf, generateReportPdf, generateClassReportCardsPdf, buildCardPayloads };
