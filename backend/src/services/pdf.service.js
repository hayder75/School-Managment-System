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

  const grades = await db('grades')
    .where({ 'grades.tenant_id': tenantId, 'grades.student_id': studentId })
    .leftJoin('exams', 'grades.exam_id', 'exams.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select('subjects.name as subject', 'grades.marks_obtained', 'exams.total_marks', 'exams.name as exam_name');

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
    const score = parseFloat(g.marks_obtained) || 0;
    const max = parseFloat(g.total_marks) || 0;
    const letter = max && score ? (score / max >= 0.9 ? 'A' : score / max >= 0.8 ? 'B' : score / max >= 0.7 ? 'C' : score / max >= 0.6 ? 'D' : 'F') : '-';
    doc.text(g.subject || 'Unknown', 50, doc.y, { width: 200, continued: true });
    doc.text(score ? score.toString() : '-', 300, doc.y, { width: 80, continued: true });
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
    .select('users.first_name', 'users.last_name')
    .first();
  const fees = await db('payments').where({ tenant_id: tenantId, student_id: studentId });
  const structures = await db('fee_structures').where({ tenant_id: tenantId });

  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on('data', (b) => buffers.push(b));

  doc.fontSize(20).text('INVOICE', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Student: ${student?.first_name || ''} ${student?.last_name || ''}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  doc.fontSize(10).text('Item', 50, doc.y, { width: 250, continued: true });
  doc.text('Amount', 350, doc.y);
  doc.moveDown(0.5);

  let total = 0;
  for (const f of structures) {
    doc.text(f.name, 50, doc.y, { width: 250, continued: true });
    doc.text(`${f.amount} ETB`, 350, doc.y);
    total += Number(f.amount || 0);
    doc.moveDown(0.3);
  }
  doc.moveDown();
  doc.fontSize(12).text(`Total: ${total} ETB`, { align: 'right' });

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
    .select('payroll.*', 'users.first_name', 'users.last_name', 'salary_grades.name as grade_name')
    .first();
  if (!payroll) throw new Error('NOT_FOUND');

  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on('data', (b) => buffers.push(b));

  doc.fontSize(20).text('PAYSLIP', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Employee: ${payroll.first_name} ${payroll.last_name}`);
  doc.text(`Grade: ${payroll.grade_name || 'N/A'}`);
  doc.text(`Period: ${payroll.month}/${payroll.year}`);
  doc.moveDown();

  doc.text(`Basic Pay: ${payroll.basic_pay} ETB`);
  doc.text(`Allowances: ${payroll.allowances_total || 0} ETB`);
  doc.text(`Deductions: ${payroll.deductions_total || 0} ETB`);
  doc.moveDown();
  doc.fontSize(14).text(`Net Pay: ${payroll.net_pay} ETB`, { align: 'right' });

  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

module.exports = { generateReportCard, generateInvoice, generatePayslip };
