const PDFDocument = require('pdfkit');
const db = require('../config/database');

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

async function generateReportCard(tenantId, studentId, academicYear) {
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
  doc.fontSize(12).text(`Student: ${student.first_name} ${student.last_name}`);
  doc.fontSize(10);
  doc.text(`Class: ${student.class_name || 'N/A'}   |   Student #: ${student.student_number || 'N/A'}`);
  if (primaryGuardian) {
    const rel = primaryGuardian.relationship || 'guardian';
    const edu = primaryGuardian.education_level ? `   |   Education: ${primaryGuardian.education_level}` : '';
    doc.text(`Guardian: ${primaryGuardian.first_name} ${primaryGuardian.last_name} (${rel})${edu}`);
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
  doc.fontSize(12).text(`Student: ${student.first_name} ${student.last_name}`);
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

  doc.fontSize(11).text(`Employee: ${payroll.first_name} ${payroll.last_name}`);
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

module.exports = { generateReportCard, generateInvoice, generatePayslip };
