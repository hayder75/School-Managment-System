const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Header keeps the school brand; the body is clean black-on-white (no colour).
const BLUE = '#1f3fbf';
const RED = '#e21f26';
const GOLD = '#ffd21e';
const INK = '#141821';
const BODY = '#2b303a';
const MUTED = '#5b6069';
const BORDER = '#8a9099';   // table / box lines
const LINE = '#b9bfc8';     // lighter rules
const WHITE = '#ffffff';

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');

const r1 = (v) => (v == null || v === '' ? null : Math.round(Number(v) * 10) / 10);
const fmt = (v) => { const x = r1(v); return x == null ? '—' : String(x); };
function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

const DEFAULT_SCALE = [
  { letter: 'A', min: 90, max: 100 },
  { letter: 'B', min: 80, max: 89.99 },
  { letter: 'C', min: 70, max: 79.99 },
  { letter: 'D', min: 60, max: 69.99 },
  { letter: 'E', min: 50, max: 59.99 },
  { letter: 'F', min: 0, max: 49.99 },
];
function letterOf(scale, pct) {
  for (const b of scale) if (pct >= Number(b.min) && pct <= Number(b.max)) return b.letter;
  return 'F';
}

function drawCard(doc, p) {
  const L = 32, R = 563, W = R - L;
  const pageH = doc.page.height;
  const scale = Array.isArray(p.scale) && p.scale.length ? p.scale : DEFAULT_SCALE;
  const subjects = Array.isArray(p.subjects) ? p.subjects : [];
  const att = p.attendance || {};
  const rank = p.rank ? Number(p.rank) : null;
  const total = p.studentCount || 0;
  const avg = r1(p.average);
  const overall = avg == null ? '—' : letterOf(scale, avg);

  const text = (s, x, y, w, o = {}) =>
    doc.font(o.font || 'Helvetica').fontSize(o.size || 9.5).fillColor(o.color || BODY)
      .text(s, x, y, { width: w, align: o.align || 'left', lineBreak: true, lineGap: o.lineGap || 2, ...(o.ellipsis ? { ellipsis: true, height: o.height } : {}) });

  // ═══════════ HEADER (kept from the approved design) ═══════════
  const hTop = 28, hH = 92, hBot = hTop + hH;
  doc.rect(L, hTop, W, hH).fill(BLUE);
  doc.rect(L, hTop, W, 4).fill(RED);
  doc.rect(L, hBot - 4, W, 4).fill(GOLD);
  doc.roundedRect(L + 10, hTop + 10, 72, 72, 6).fill(WHITE);
  try { if (fs.existsSync(LOGO_PATH)) doc.image(LOGO_PATH, L + 15, hTop + 13, { fit: [62, 66] }); } catch (e) { /* optional */ }
  const sx = L + 96;
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(18.5).text(String(p.schoolName || 'School'), sx, hTop + 18, { width: W - 96 - 150, lineBreak: false });
  doc.fillColor('#d6ddfb').font('Helvetica').fontSize(9.5).text('STUDENT ACADEMIC REPORT CARD', sx, hTop + 44, { width: W - 96 - 150, lineBreak: false });
  doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(8.4).text(`${p.schoolYear || ''}   ·   ${p.termLabel || ''}`.toUpperCase(), sx, hTop + 62, { width: W - 96 - 150, lineBreak: false });
  const pillW = 132;
  doc.roundedRect(R - pillW - 12, hTop + 20, pillW, 50, 6).fill(WHITE);
  doc.fillColor('#152f8f').font('Helvetica-Bold').fontSize(14).text('REPORT CARD', R - pillW - 12, hTop + 28, { width: pillW, align: 'center', lineBreak: false });
  doc.fillColor(MUTED).font('Helvetica').fontSize(7.6).text((p.reportType || 'TERM REPORT').toUpperCase(), R - pillW - 12, hTop + 48, { width: pillW, align: 'center', lineBreak: false });

  // ═══════════ STUDENT DETAILS (plain bordered box) ═══════════
  let y = hBot + 10;
  const infoH = 56;
  doc.rect(L, y, W, infoH).lineWidth(0.9).stroke(BORDER);
  // vertical dividers
  doc.moveTo(L + W / 3, y).lineTo(L + W / 3, y + infoH).stroke(LINE);
  doc.moveTo(L + (2 * W) / 3, y).lineTo(L + (2 * W) / 3, y + infoH).stroke(LINE);
  doc.moveTo(L, y + infoH / 2).lineTo(R, y + infoH / 2).stroke(LINE);
  const field = (label, value, x, cy, w, bold) => {
    doc.fillColor(MUTED).font('Helvetica').fontSize(6.8).text(label.toUpperCase(), x + 8, cy + 6, { width: w - 16, lineBreak: false });
    doc.fillColor(INK).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9.8).text(value || '—', x + 8, cy + 16, { width: w - 16, ellipsis: true, lineBreak: false });
  };
  const cw = W / 3;
  const cs = (() => { const n = String(p.className || '').trim(); const s = String(p.section || '').trim(); if (!s) return n; if (new RegExp(`(^|\\s)${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i').test(n)) return n; return n ? `${n} · ${s}` : s; })();
  field('Student name', p.studentName, L, y, cw, true);
  field('Student ID', p.studentNumber, L + cw, y, cw);
  field('Class / Section', cs, L + 2 * cw, y, cw);
  field('Grade', p.gradeLevel != null ? `Grade ${p.gradeLevel}` : '—', L, y + infoH / 2, cw);
  field('Class advisor', p.classAdvisor, L + cw, y + infoH / 2, cw);
  field('Rank in class', rank ? `${rank} of ${total}` : '—', L + 2 * cw, y + infoH / 2, cw);
  y += infoH + 14;

  // ═══════════ SUBJECTS TABLE ═══════════
  const cols = [
    { h: 'Subject', w: 196, a: 'left' },
    { h: 'CA', w: 56, a: 'center' },
    { h: 'Exam', w: 62, a: 'center' },
    { h: 'Total /100', w: 78, a: 'center' },
    { h: 'Grade', w: 62, a: 'center' },
    { h: 'Rank', w: 77, a: 'center' },
  ];
  const headH = 20;
  const rowH = subjects.length > 12 ? 15 : 18;
  // header
  doc.rect(L, y, W, headH).fill(WHITE).lineWidth(1).stroke(BORDER);
  let cx = L;
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(8.8);
  for (const c of cols) { doc.text(c.h, cx + 4, y + 6, { width: c.w - 8, align: c.a, lineBreak: false }); cx += c.w; }
  doc.moveTo(L, y + headH).lineTo(R, y + headH).lineWidth(1.1).stroke(BORDER);
  let sy = y + headH;
  subjects.forEach((s, i) => {
    const cy = sy + i * rowH;
    const vals = [s.name || '—', fmt(s.ca), fmt(s.exam), fmt(s.mark), s.letter || '—', s.rank ? ordinal(s.rank) : '—'];
    cx = L;
    cols.forEach((c, ci) => {
      doc.font(ci === 0 || ci === 3 || ci === 4 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
        .fillColor(ci === 0 ? INK : BODY).text(vals[ci], cx + 4, cy + (rowH - 9) / 2, { width: c.w - 8, align: c.a, ellipsis: true, lineBreak: false });
      if (ci > 0) doc.moveTo(cx, cy).lineTo(cx, cy + rowH).lineWidth(0.5).stroke(LINE);
      cx += c.w;
    });
    doc.moveTo(L, cy + rowH).lineTo(R, cy + rowH).lineWidth(0.5).stroke(LINE);
  });
  sy += subjects.length * rowH;
  doc.rect(L, y, W, sy - y).lineWidth(1).stroke(BORDER);
  y = sy + 14;

  // ═══════════ SUMMARY: overall (left) + attendance (right) ═══════════
  const sumH = 66;
  const halfW = (W - 12) / 2;
  // overall box
  doc.rect(L, y, halfW, sumH).lineWidth(0.9).stroke(BORDER);
  doc.moveTo(L, y + 18).lineTo(L + halfW, y + 18).lineWidth(1).stroke(BORDER);
  text('OVERALL RESULT', L + 8, y + 5, halfW - 16, { font: 'Helvetica-Bold', size: 8.6, color: INK });
  const sumRow = (k, v, x, cy, w, boldV) => {
    doc.fillColor(MUTED).font('Helvetica').fontSize(8.6).text(k, x + 8, cy, { width: w - 90, lineBreak: false });
    doc.fillColor(INK).font(boldV ? 'Helvetica-Bold' : 'Helvetica').fontSize(boldV ? 10 : 9.4).text(v, x + w - 92, cy - 1, { width: 84, align: 'right', lineBreak: false });
  };
  sumRow('Average', avg == null ? '—' : `${avg} / 100`, L, y + 25, halfW, true);
  sumRow('Overall grade', overall, L, y + 41, halfW, true);
  sumRow('Class rank', rank ? `${rank} of ${total}` : '—', L, y + 57, halfW, false);
  // attendance box
  const rx = L + halfW + 12;
  doc.rect(rx, y, halfW, sumH).lineWidth(0.9).stroke(BORDER);
  doc.moveTo(rx, y + 18).lineTo(rx + halfW, y + 18).lineWidth(1).stroke(BORDER);
  text('ATTENDANCE', rx + 8, y + 5, halfW - 16, { font: 'Helvetica-Bold', size: 8.6, color: INK });
  const attCell = (k, v, i) => {
    const cwi = halfW / 4;
    const ax = rx + i * cwi;
    if (i > 0) doc.moveTo(ax, y + 18).lineTo(ax, y + sumH).lineWidth(0.5).stroke(LINE);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(String(v), ax, y + 28, { width: cwi, align: 'center', lineBreak: false });
    doc.fillColor(MUTED).font('Helvetica').fontSize(7.4).text(k, ax, y + 47, { width: cwi, align: 'center', lineBreak: false });
  };
  attCell('Present', att.present ?? 0, 0);
  attCell('Absent', att.absent ?? 0, 1);
  attCell('Late', att.late ?? 0, 2);
  attCell('Total', att.totalDays ?? ((att.present || 0) + (att.absent || 0) + (att.late || 0)), 3);
  y += sumH + 14;

  // ═══════════ GRADING SCALE (compact, plain) ═══════════
  doc.rect(L, y, W, 30).lineWidth(0.9).stroke(BORDER);
  text('GRADING', L + 8, y + 4, 70, { font: 'Helvetica-Bold', size: 8, color: MUTED });
  let gx = L + 74;
  const gw = (W - 82) / scale.length;
  scale.forEach((b) => {
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(8.6).text(b.letter, gx, y + 6, { width: 20, lineBreak: false });
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(`${fmt(b.min)}–${fmt(b.max)}`, gx + 18, y + 6.5, { width: gw - 20, lineBreak: false });
    gx += gw;
  });
  y += 30 + 14;

  // ═══════════ TEACHER'S COMMENT (ruled lines, plain) ═══════════
  const comH = 58;
  doc.rect(L, y, W, comH).lineWidth(0.9).stroke(BORDER);
  text("HOMEROOM TEACHER'S COMMENT", L + 8, y + 5, W - 16, { font: 'Helvetica-Bold', size: 8, color: MUTED });
  if (p.comment || p.remarks) {
    doc.fillColor(BODY).font('Helvetica').fontSize(9.4).text(p.comment || p.remarks, L + 8, y + 18, { width: W - 16, height: comH - 26, ellipsis: true, lineGap: 3 });
  } else {
    for (let i = 0; i < 2; i++) {
      const ly = y + 30 + i * 16;
      doc.moveTo(L + 8, ly).lineTo(R - 8, ly).lineWidth(0.5).stroke(LINE);
    }
  }
  y += comH + 12;

  // ═══════════ RESULT ═══════════
  if (p.promotionLine) {
    doc.rect(L, y, W, 22).lineWidth(0.9).stroke(BORDER);
    text(p.promotionLine, L + 8, y + 6.5, W - 16, { font: 'Helvetica-Bold', size: 9.2, color: INK, align: 'center' });
    y += 30;
  }

  // ═══════════ SIGNATURES ═══════════
  const sigY = pageH - 84;
  const slots = [['Class Advisor', L], ['Principal', L + W / 2 - 78], ['Parent / Guardian', R - 156]];
  for (const [label, x] of slots) {
    doc.moveTo(x, sigY).lineTo(x + 156, sigY).lineWidth(0.8).stroke(BORDER);
    doc.fillColor(MUTED).font('Helvetica').fontSize(7.8).text(label, x, sigY + 4, { width: 156, align: 'center', lineBreak: false });
  }
  doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(7.2)
    .text('This is a computer-generated report card. Any alteration renders it invalid.', L, pageH - 112, { width: W, align: 'center', lineBreak: false });
  doc.moveTo(L, pageH - 46).lineTo(R, pageH - 46).lineWidth(0.8).stroke(LINE);
  doc.fillColor(MUTED).font('Helvetica').fontSize(7.2)
    .text(`${p.schoolName || 'School'}  ·  Official report card  ·  ${p.studentName || ''}`, L, pageH - 40, { width: W * 0.7, lineBreak: false });
  doc.fillColor(MUTED).font('Helvetica').fontSize(7.2)
    .text(`Issued ${p.issuedAt || new Date().toISOString().slice(0, 10)}`, L + W * 0.7, pageH - 40, { width: W * 0.3, align: 'right', lineBreak: false });
}

async function generateReportCard(student, grades, attendance, termInfo) {
  if (!student || !student.__v2) return generateSimpleCard(student, grades, attendance, termInfo);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    drawCard(doc, student);
    doc.end();
  });
}

async function generateCombinedReportCards(payloads) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    payloads.forEach((p, i) => { if (i > 0) doc.addPage(); drawCard(doc, p); });
    doc.end();
  });
}

async function generateSimpleCard(student, grades, attendance, termInfo) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(20).text('Report Card', { align: 'center' });
    doc.fontSize(12).text(`Class: ${student?.class_name || 'N/A'}  |  Term: ${termInfo?.name || 'N/A'}`);
    doc.end();
  });
}

module.exports = { generateReportCard, generateCombinedReportCards, DEFAULT_SCALE, drawCard };