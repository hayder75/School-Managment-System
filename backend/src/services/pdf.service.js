const PDFDocument = require('pdfkit');
const db = require('../config/database');

async function generateReportCard(tenantId, studentId, academicYear) {
  const student = await db('students')
    .where({ 'students.tenant_id': tenantId, 'students.user_id': studentId })
    .leftJoin('users', 'students.user_id', 'users.id')
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select('students.*', 'users.first_name', 'users.last_name', 'classes.name as class_name')
    .first();
  if (!student) throw new Error('NOT_FOUND');

  let gradesQuery = db('grades')
    .where({ 'grades.tenant_id': tenantId, 'grades.student_id': studentId })
    .leftJoin('exams', 'grades.exam_id', 'exams.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select('subjects.name as subject', 'grades.marks_obtained', 'exams.total_marks', 'exams.name as exam_name', 'exams.date as exam_date');

  if (academicYear) {
    gradesQuery = gradesQuery.whereRaw("EXTRACT(YEAR FROM exams.date) = ?", [parseInt(academicYear, 10)]);
  }
  const grades = await gradesQuery.orderBy('exams.date', 'asc');

  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on('data', (b) => buffers.push(b));
  doc.on('end', () => {});

  doc.fontSize(20).text('Report Card', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Student: ${student.first_name} ${student.last_name}`);
  doc.text(`Class: ${student.class_name || 'N/A'}`);
  doc.text(`Year: ${academicYear || new Date().getFullYear()}`);
  doc.moveDown();

  doc.fontSize(10).text('Subject', 50, doc.y, { width: 200, continued: true });
  doc.text('Score', 300, doc.y, { width: 80, continued: true });
  doc.text('Grade', 400, doc.y);
  doc.moveDown(0.5);

  for (const g of grades) {
    const hasScore = g.marks_obtained != null && g.marks_obtained !== '';
    const score = hasScore ? parseFloat(g.marks_obtained) : null;
    const max = g.total_marks != null ? parseFloat(g.total_marks) : null;
    const letter = score != null && max && max > 0
      ? (score / max >= 0.9 ? 'A' : score / max >= 0.8 ? 'B' : score / max >= 0.7 ? 'C' : score / max >= 0.6 ? 'D' : 'F')
      : '-';
    doc.text(g.subject || 'Unknown', 50, doc.y, { width: 200, continued: true });
    doc.text(score != null ? score.toString() : '-', 300, doc.y, { width: 80, continued: true });
    doc.text(letter, 400, doc.y);
    doc.moveDown(0.3);
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
