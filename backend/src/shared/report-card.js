const PDFDocument = require('pdfkit');

function fmt(n) {
  return n == null ? '—' : String(Math.round(n * 10) / 10);
}

/**
 * Ethiopian MoE style report card.
 * subjects: [{ name, ca, exam, mark, letter }]  (mark out of 100)
 */
async function generateReportCard(student, grades, attendance, termInfo) {
  // Backwards-compatible: if called the old way (grades array only), render simple card
  if (!student.__v2) return generateSimpleCard(student, grades, attendance, termInfo);

  const {
    schoolName = 'School', studentName, studentNumber, className,
    termName, subjects, average, rank, studentCount, remarks, promotionLine,
  } = student;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(schoolName.toUpperCase(), { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(11).font('Helvetica').text('STUDENT REPORT CARD', { align: 'center' });
    doc.moveDown(0.8);

    // Student info grid
    const infoTop = doc.y;
    const colW = 250;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Student Name:', 40, infoTop);
    doc.text('Student ID:', 40 + colW, infoTop);
    doc.text('Class / Section:', 40, infoTop + 16);
    doc.text('Academic Term:', 40 + colW, infoTop + 16);
    doc.font('Helvetica');
    doc.text(studentName || '—', 130, infoTop);
    doc.text(studentNumber || '—', 40 + colW + 70, infoTop);
    doc.text(className || '—', 130, infoTop + 16);
    doc.text(termName || '—', 40 + colW + 70, infoTop + 16);
    doc.moveDown(3);

    // Marks table
    const tTop = doc.y + 8;
    const cols = [
      { label: 'Subject', x: 40, w: 170 },
      { label: 'CA (50%)', x: 210, w: 65 },
      { label: 'Exam (50%)', x: 275, w: 65 },
      { label: 'Semester /100', x: 340, w: 80 },
      { label: 'Grade', x: 420, w: 60 },
      { label: 'Outcomes', x: 480, w: 75 },
    ];
    doc.rect(40, tTop, 515, 20).fill('#1e293b');
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9);
    for (const c of cols) doc.text(c.label, c.x + 4, tTop + 6, { width: c.w - 8 });
    let y = tTop + 20;

    doc.font('Helvetica').fillColor('#000');
    let totalMark = 0;
    const list = subjects || [];
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (i % 2 === 0) {
        doc.rect(40, y, 515, 18).fill('#f1f5f9');
      }
      doc.fillColor('#000').fontSize(9);
      doc.text(s.name || '—', cols[0].x + 4, y + 5, { width: cols[0].w - 8 });
      doc.text(fmt(s.ca), cols[1].x + 4, y + 5, { width: cols[1].w - 8, align: 'center' });
      doc.text(fmt(s.exam), cols[2].x + 4, y + 5, { width: cols[2].w - 8, align: 'center' });
      doc.font('Helvetica-Bold');
      doc.text(fmt(s.mark), cols[3].x + 4, y + 5, { width: cols[3].w - 8, align: 'center' });
      doc.text(s.letter || '—', cols[4].x + 4, y + 5, { width: cols[4].w - 8, align: 'center' });
      doc.font('Helvetica');
      doc.text((s.mark ?? 0) >= 50 ? 'PASSED' : 'FAILED', cols[5].x + 4, y + 5, { width: cols[5].w - 8, align: 'center' });
      totalMark += Number(s.mark || 0);
      y += 18;
    }

    // Totals row
    doc.rect(40, y, 515, 20).fill('#e2e8f0');
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(9);
    doc.text('TOTAL / AVERAGE', cols[0].x + 4, y + 6);
    const avg = list.length ? Math.round((totalMark / list.length) * 10) / 10 : 0;
    doc.text(String(totalMark.toFixed(1)), 340 + 4, y + 6, { width: 72, align: 'center' });
    doc.text(String(avg), 420 + 4, y + 6, { width: 52, align: 'center' });
    y += 32;

    // Rank & attendance summary
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`Average: ${avg} / 100`, 40, y);
    doc.text(`Rank: ${rank ?? '—'}${studentCount ? ` of ${studentCount}` : ''}`, 200, y);
    if (attendance) {
      doc.text(`Attendance — Present: ${attendance.present || 0}  Absent: ${attendance.absent || 0}  Late: ${attendance.late || 0}`, 330, y, { width: 230 });
    }
    y += 24;

    // Remarks & promotion
    doc.font('Helvetica').fontSize(10);
    doc.text(`Remarks: ${remarks || '_________________________________________'}`, 40, y);
    y += 30;
    doc.font('Helvetica-Bold');
    doc.text(promotionLine || '', 40, y);

    // Signatures
    doc.font('Helvetica').fontSize(9).fillColor('#334155');
    const sigY = doc.page.height - 110;
    doc.text('_____________________', 40, sigY);
    doc.text('_____________________', 240, sigY);
    doc.text('_____________________', 440, sigY);
    doc.fontSize(8).fillColor('#64748b');
    doc.text('Homeroom Teacher', 40, sigY + 14, { width: 120, align: 'center' });
    doc.text('Principal', 240, sigY + 14, { width: 120, align: 'center' });
    doc.text('Parent / Guardian', 440, sigY + 14, { width: 120, align: 'center' });

    doc.end();
  });
}

// legacy simple card
async function generateSimpleCard(student, grades, attendance, termInfo) {
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
