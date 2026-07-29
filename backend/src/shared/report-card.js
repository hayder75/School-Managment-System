const PDFDocument = require('pdfkit');

async function generateReportCard(student, grades, attendance, termInfo) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('Report Card', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`${student.first_name} ${student.last_name}`, { align: 'center' });
    doc.fontSize(12).text(`Class: ${student.class_name || 'N/A'}  |  Term: ${termInfo?.name || 'N/A'}`);
    doc.moveDown();

    doc.fontSize(14).text('Academic Performance', { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.fontSize(10);
    doc.text('Subject', 50, tableTop, { width: 200 });
    doc.text('Marks', 270, tableTop, { width: 80, align: 'center' });
    doc.text('Grade', 370, tableTop, { width: 80, align: 'center' });
    doc.moveDown();

    if (grades && grades.length > 0) {
      for (const g of grades) {
        const y = doc.y;
        doc.text(g.subject_name || 'N/A', 50, y, { width: 200 });
        doc.text(String(g.marks_obtained ?? '-'), 270, y, { width: 80, align: 'center' });
        doc.text(g.grade_letter || '-', 370, y, { width: 80, align: 'center' });
        doc.moveDown(0.3);
      }
    } else {
      doc.text('No grades recorded.', 50, doc.y);
    }

    doc.moveDown(2);
    doc.fontSize(14).text('Attendance Summary', { underline: true });
    doc.moveDown(0.5);

    if (attendance) {
      doc.fontSize(10);
      doc.text(`Present: ${attendance.present || 0}`);
      doc.text(`Absent: ${attendance.absent || 0}`);
      doc.text(`Late: ${attendance.late || 0}`);
    } else {
      doc.text('No attendance data.');
    }

    doc.end();
  });
}

module.exports = { generateReportCard };
