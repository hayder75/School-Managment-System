// Generates the 2-week role-by-role system training program PDF.
// Usage: node scripts/generate_training_pdf.js
// Output: docs/SMS_Training_Program_2_Weeks.pdf
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { ROLE_LABELS } = require('../src/content/manual.content');

const OUT = path.join(__dirname, '..', '..', 'docs', 'SMS_Training_Program_2_Weeks.pdf');

// geometry
const PW = 595.28, PH = 841.89, M = 44;
const COL = 462;
const C_X = Math.round((PW - COL) / 2);
const C_W = COL;
const TOP = 84;

// palette
const INK = '#1A1A1A', BODY = '#3C3C43', MUTED = '#8A8F98', ACCENT = '#5E6AD2';
const BORDER = '#E3E4E8', SOFT = '#F7F8F9';
const DATE = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ── program data ─────────────────────────────────────────────────────
const TRACKS = [
  { key: 'owner', roles: ['owner'], focus: 'Oversight & configuration' },
  { key: 'admin', roles: ['admin'], focus: 'Running the school day to day' },
  { key: 'gm', roles: ['general_manager'], focus: 'Executive oversight' },
  { key: 'academic', roles: ['principal', 'vice_principal', 'quality_director'], focus: 'Academics & quality' },
  { key: 'hr', roles: ['hr'], focus: 'People operations' },
  { key: 'finance', roles: ['finance', 'accountant'], focus: 'Fees & payroll' },
  { key: 'cashier', roles: ['cashier'], focus: 'Front desk' },
  { key: 'teacher', roles: ['teacher'], focus: 'Teaching & recording' },
  { key: 'librarian', roles: ['librarian'], focus: 'Library operations' },
  { key: 'ops', roles: ['general_services', 'security_head', 'shift_coordinator'], focus: 'Operations & security' },
  { key: 'community', roles: ['student', 'parent'], focus: 'Using the portal' },
];

const DAYS_FULL = [
  {
    day: 1, title: 'Orientation & sign-in',
    am: { who: 'Whole school · 8:30–10:30', topic: 'What the system is for, and how it is organised', detail: 'The five structures everyone depends on: academic year and terms, levels/classes/sections, roles and permissions, active vs archived, and scope levels. Show the dashboard each role sees on arrival.' },
    pm: { who: 'Whole school · 10:45–12:15', topic: 'Hands-on: sign in, find things, read the menu', detail: 'Everyone signs in with their own account. Find the menu, use search, switch language, and open the in-app User Manual from the sidebar.' },
    out: 'Each participant can sign in and navigate their own role.',
  },
  {
    day: 2, title: 'Students, classes & the academic structure',
    am: { who: 'Admin · 8:30–10:30', topic: 'Registering a student end to end', detail: 'Students → Add Student: names, guardian phones, class and section. Then the Parents screen — guardians matched by phone, and the Unlinked Students list to link or create a guardian.' },
    pm: { who: 'All tracks · 10:45–12:15', topic: 'Classes, subjects, homeroom, timetable', detail: 'How a class is created and what depends on it: subject assignment, homeroom teacher, timetable slots, exams and attendance. Roster drill-down on the Classes screen.' },
    out: 'A new student is registered, correctly placed, and guardian issues resolved.',
  },
  {
    day: 3, title: 'Attendance & academic records',
    am: { who: 'Teacher track · 8:30–10:30', topic: 'Daily attendance and entering marks', detail: 'Marking a class Present/Late/Absent with bulk actions, then creating an exam, setting the total, and entering marks. Where results appear afterwards.' },
    pm: { who: 'Admin/Academics + HR · 10:45–12:15', topic: 'Staff attendance, leave and the weekly grid', detail: 'HR demonstrates the daily summary, the weekly grid and period statistics. Show the deduction settings and how leave approvals flow into availability.' },
    out: 'Teachers mark attendance and enter marks; HR can complete a week of staff attendance.',
  },
  {
    day: 4, title: 'Results, report cards & quality',
    am: { who: 'Academics · 8:30–10:30', topic: 'Report cards, KPIs and quality assurance', detail: 'Producing a term report card, reading the aggregation (subject %, letter, overall, GPA), and running teacher KPI reviews with automatic sources and reviewer overrides. The Quality Assurance screen.' },
    pm: { who: 'Whole school · 10:45–12:15', topic: 'Exercise: run a term end-to-end', detail: 'Each track completes its own term-close tasks: teacher submits marks, HR finalises attendance, admin checks the class result view.' },
    out: 'A full term of attendance and marks is closed and report cards generate.',
  },
  {
    day: 5, title: 'Fees, payments & the front desk',    am: { who: 'Finance/Cashier · 8:30–10:30', topic: 'Fee structures, billing and taking payments', detail: 'Defining fee structures per grade, running monthly billing, recording a payment, and reading outstanding balances. Cashier runs the Enroll wizard at the counter.' },
    pm: { who: 'Finance · 10:45–12:15', topic: 'Reconciliation and collection reporting', detail: 'The Accountant Portal reconciliation view, collection report by method and class, and the outstanding balances ageing sheet.' },
    out: 'A month can be billed, a payment taken, and the position reported.',
  },
  {
    day: 6, title: 'Payroll, tax & overtime',
    am: { who: 'Finance · 8:30–10:30', topic: 'Running payroll with auto-calculations', detail: 'Salary Register → payroll. Calculate: income tax from the brackets, employee/employer pension, and the attendance deduction. Post the run and read the Payroll Audit trail.' },
    pm: { who: 'HR + Finance · 10:45–12:15', topic: 'Overtime and how it reaches payroll', detail: 'Recording overtime, the multipliers (day 1.5×, night 1.75×, rest day 2×, holiday 2.5×), auto type-detection, approval, and the automatic pickup into payroll. Adjust the settings live.' },
    out: 'A payroll run posts correctly with overtime and deductions included.',
  },
  {
    day: 7, title: 'Library, assets & operations',        am: { who: 'Librarian + Operations · 8:30–10:30', topic: 'Library: catalogue, loans, transactions, inventory', detail: 'Add titles and copies, issue and return, find an overdue loan in Transactions, and run Book Assessment + Inventory to reconcile stock.' },
    pm: { who: 'Operations + Security · 10:45–12:15', topic: 'Assets, the Security Hub and shifts', detail: 'Asset register with codes and status; visitors, incidents and gate passes; the Shift Hub duty roster and substitutions tied to the timetable.' },
    out: 'A book is issued and returned; an asset and a visitor are logged.',
  },
  {
    day: 8, title: 'Reporting & sharing',            am: { who: 'Whole school · 8:30–10:30', topic: 'The report center and what each role sees', detail: 'Tour the catalogue role by role. Demonstrate the multi-sheet HR workbook (Staff, Leave, Staff Attendance, Overtime) and the per-class student sheets.' },
    pm: { who: 'Whole school · 10:45–12:15', topic: 'Exports, share links and privacy', detail: 'Excel/CSV/PDF/print exports; creating a share link with an expiry; aggregate-only vs named lists; revoking a link. Emphasise that a shared link is public.' },
    out: 'Each participant exports the report their role uses and shares it safely.',
  },
  {
    day: 9, title: 'Administration, permissions & data', am: { who: 'Owner/Admin · 8:30–10:30', topic: 'Users, roles and permissions', detail: 'Creating users, assigning roles, reviewing permissions per role, resetting passwords, and archiving vs deleting. Discuss least-privilege practice.' },
    pm: { who: 'Owner/Admin · 10:45–12:15', topic: 'Import, backup, settings and audit', detail: 'Bulk import with validation, taking and storing a backup, key settings, and reading the Audit Logs. Practise a backup + a role review.' },
    out: 'A backup is taken and stored; a role is reviewed and tightened.',
  },
  {
    day: 10, title: 'Practice, assessment & sign-off', am: { who: 'Whole school · 8:30–10:30', topic: 'Guided practice: each role runs its real work', detail: 'Every role completes its own core workflow on live data with an administrator circulating. Use the Troubleshooting table in the manual as the reference.' },
    pm: { who: 'All · 10:45–12:15', topic: 'Assessment, feedback and next steps', detail: 'Short practical assessment per role, group feedback, a question sweep, and agree what each role will own going forward. Sign-off sheet completed.' },
    out: 'Every participant is signed off as competent in their own role.',
  },
];

// role-specific emphasis per day (which days a role attends which session)
const ROLE_PLAN = {
  teacher: { days: [1, 3, 4, 8, 10], note: 'Focus on attendance, marks, report cards, timetable, My Teaching report and the student/parent views they will be asked about.' },
  admin: { days: [1, 2, 3, 4, 5, 8, 9, 10], note: 'Owns nearly every screen; attend all finance and HR sessions as the person who keeps the school running.' },
  owner: { days: [1, 2, 8, 9, 10], note: 'Oversight: structure, reporting, permissions and backups rather than daily entry.' },
  general_manager: { days: [1, 8, 9, 10], note: 'Executive dashboard, report reading, share links and audit.' },
  principal: { days: [1, 2, 3, 4, 8, 10], note: 'Quality assurance, teacher KPIs, discipline, scoped reporting.' },
  vice_principal: { days: [1, 2, 3, 4, 8, 10], note: 'As Principal plus the Shift Hub and coverage.' },
  quality_director: { days: [1, 2, 3, 4, 8, 10], note: 'Teacher KPI reviews and cross-level quality reporting.' },
  hr: { days: [1, 3, 6, 9, 10], note: 'Staff attendance, leave, overtime and the HR reports; supplies payroll inputs.' },
  finance: { days: [1, 5, 6, 8, 10], note: 'Fees, payments, payroll, tax, overtime payment and reconciliation.' },
  accountant: { days: [1, 5, 6, 8, 10], note: 'As Finance plus the reconciliation portal.' },
  cashier: { days: [1, 2, 5, 10], note: 'Enrolment at the counter, taking payments, end-of-day reconciliation.' },
  librarian: { days: [1, 7, 8, 10], note: 'Catalogue, loans, transactions and inventory.' },
  general_services: { days: [1, 7, 8, 10], note: 'Assets, operations and expenses; library as a service.' },
  security_head: { days: [1, 7, 8, 10], note: 'Visitors, incidents, gate passes and the Security report.' },
  shift_coordinator: { days: [1, 7, 8, 10], note: 'Duty roster, coverage and substitutions.' },
  student: { days: [1, 8, 10], note: 'My Timetable, My Progress and My Library.' },
  parent: { days: [1, 8, 10], note: 'My Children, results, attendance and fee position; finding a guardian account.' },
};

const ASSESSMENT = [
  ['Admin', 'Register a new student with a guardian, place them in a class, and produce the class roster.', 'Student appears on the roster; guardian linked on the Parents screen.'],
  ['Teacher', 'Mark a full week of attendance for one class and enter marks for a subject exam.', 'Attendance saved; marks aggregate to a subject percentage and letter grade.'],
  ['Finance', 'Bill the month, record a payment, and calculate (not post) one payroll run.', 'Balance reduces on payment; payroll shows tax, pension, deductions and approved overtime.'],
  ['HR', 'Fill a week of staff attendance on the grid, approve a leave request, and add an overtime entry.', 'Week complete; leave appears as unavailable; overtime priced at the right multiplier.'],
  ['Librarian', 'Add a title, issue it to a student, return it, and run a stock reconciliation.', 'Copy count restored; discrepancy recorded with a reason.'],
  ['Principal / QD', 'Open Quality Assurance, review flagged teachers, and publish a KPI period.', 'Reviews completed; ratings feed the quality screen.'],
  ['Owner / GM', 'Export the Staff & HR workbook and share a report with an expiry.', 'Workbook has the expected sheets; shared link opens and expires.'],
  ['Security / Ops', 'Log a visitor, raise an incident, and issue a gate pass.', 'All three registers populated and exportable.'],
];

// ── renderer ────────────────────────────────────────────────────────
let LAST_PAGES = [];

function render(opts) {
  const doc = new PDFDocument({
    margin: 0, size: 'A4', bufferPages: true,
    info: { Title: 'School Management System — 2-Week Training Program', Author: 'EnglesTech Plc' },
  });
  let y = 0;
  const setY = (v) => { y = v; };
  const need = (h) => { if (y + h > PH - 58) { doc.addPage(); setY(TOP); } };
  const rule = (yy, c = BORDER, w = 0.7) => doc.moveTo(C_X, yy).lineTo(C_X + C_W, yy).lineWidth(w).stroke(c);

  const header = () => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(ACCENT).text('Mount Olive School', M, 34, { width: 240, lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('2-Week Training Program', M, 45, { width: 240, lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(DATE, PW - M - 130, 39, { width: 130, align: 'right', lineBreak: false });
    doc.moveTo(M, 62).lineTo(PW - M, 62).lineWidth(0.7).stroke(BORDER);
  };

  const para = (t, o = {}) => {
    const size = o.size || 10.2;
    const h = doc.font('Helvetica').fontSize(size).heightOfString(t, { width: C_W, lineGap: 4.5 });
    need(h + 11);
    doc.font('Helvetica').fontSize(size).fillColor(o.color || BODY).text(t, C_X, y, { width: C_W, lineGap: 4.5 });
    setY(y + h + 11);
  };
  const h2 = (t) => {
    const h = doc.font('Helvetica-Bold').fontSize(13).heightOfString(t, { width: C_W, lineGap: 2 });
    need(h + 22); setY(y + 12);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(t, C_X, y, { width: C_W, lineGap: 2 });
    setY(y + h + 8);
  };
  const ul = (...items) => {
    for (const it of items) {
      const w = C_W - 16;
      const h = doc.font('Helvetica').fontSize(10.2).heightOfString(it, { width: w, lineGap: 4.5 });
      need(h + 5);
      doc.circle(C_X + 3.2, y + 5.6, 1.7).fill(ACCENT);
      doc.font('Helvetica').fontSize(10.2).fillColor(BODY).text(it, C_X + 16, y, { width: w, lineGap: 4.5 });
      setY(y + h + 5);
    }
    setY(y + 6);
  };
  const steps = (...items) => {
    items.forEach((it, i) => {
      const w = C_W - 21;
      const h = doc.font('Helvetica').fontSize(10.2).heightOfString(it, { width: w, lineGap: 4.5 });
      need(h + 7);
      doc.font('Helvetica-Bold').fontSize(10.2).fillColor(ACCENT).text(`${i + 1}.`, C_X + 2, y, { width: 14, lineBreak: false });
      doc.font('Helvetica').fontSize(10.2).fillColor(BODY).text(it, C_X + 21, y, { width: w, lineGap: 4.5 });
      setY(y + h + 7);
    });
    setY(y + 7);
  };
  const note = (t) => {
    const pad = 10, w = C_W - pad * 2 - 16;
    const h = doc.font('Helvetica').fontSize(9.8).heightOfString(t, { width: w, lineGap: 4.5 });
    need(h + pad * 2 + 14);
    doc.rect(C_X, y, C_W, h + pad * 2).fill('#FAFAFC');
    doc.rect(C_X, y, 2.5, h + pad * 2).fill(ACCENT);
    doc.font('Helvetica').fontSize(9.8).fillColor(BODY).text(t, C_X + pad + 6, y + pad, { width: w, lineGap: 4.5 });
    setY(y + h + pad * 2 + 14);
  };
  const cellH = (cells, colW) => Math.max(...cells.map((c, i) => doc.font('Helvetica').fontSize(9).heightOfString(String(c ?? ''), { width: colW[i] - 12, lineGap: 3 }))) + 11;
  const distribute = (head, rows, width) => {
    const w = head.map((_, i) => {
      let m = String(head[i]).length;
      for (const r of rows) m = Math.max(m, String(r[i] ?? '').length);
      return Math.min(Math.max(m, 8), 40);
    });
    const tot = w.reduce((a, b) => a + b, 0);
    const out = w.map((x) => Math.max(50, (x / tot) * width));
    out[out.length - 1] += width - out.reduce((a, b) => a + b, 0);
    return out;
  };
  const table = (head, rows) => {
    const colW = distribute(head, rows, C_W);
    let hh = cellH(head, colW);
    need(hh + 10);
    doc.rect(C_X, y, C_W, hh).fill(SOFT);
    let cx = C_X;
    head.forEach((c, i) => { doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(String(c), cx + 7, y + 6, { width: colW[i] - 12, lineGap: 3 }); cx += colW[i]; });
    rule(y + hh); setY(y + hh);
    rows.forEach((row) => {
      const rh = cellH(row, colW);
      if (y + rh > PH - 58) { doc.addPage(); setY(TOP); }
      cx = C_X;
      row.forEach((c, i) => { doc.font('Helvetica').fontSize(9).fillColor(BODY).text(String(c ?? ''), cx + 7, y + 6, { width: colW[i] - 12, lineGap: 3 }); cx += colW[i]; });
      setY(y + rh);
      doc.moveTo(C_X, y).lineTo(C_X + C_W, y).lineWidth(0.5).stroke(BORDER);
    });
    rule(y); setY(y + 14);
  };
  const chapterHead = (eyebrow, title) => {
    header(); setY(TOP);
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(eyebrow.toUpperCase(), C_X, y, { width: C_W, characterSpacing: 0.8 });
    setY(y + 22);
    doc.font('Helvetica-Bold').fontSize(24).fillColor(INK).text(title, C_X, y, { width: C_W, lineGap: 2 });
    setY(y + doc.heightOfString(title, { width: C_W, lineGap: 2 }) + 13);
    rule(y, ACCENT, 1.4); setY(y + 18);
  };

  // cover
  doc.rect(0, 0, PW, PH).fill('#fff');
  doc.rect(0, 0, PW, 5).fill(ACCENT);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(ACCENT).text('MOUNT OLIVE SCHOOL', M, 100, { width: 400, characterSpacing: 1.4 });
  doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('ENGLISH MEDIUM', M, 114, { width: 400, characterSpacing: 1.4 });
  doc.moveTo(M, 136).lineTo(PW - M, 136).lineWidth(0.7).stroke(BORDER);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('TRAINING PROGRAM', M, 174, { width: 400, characterSpacing: 1.2 });
  doc.font('Helvetica-Bold').fontSize(34).fillColor(INK).text('2-Week System\nTraining', M, 196, { width: 440, lineGap: 4 });
  doc.font('Helvetica').fontSize(13).fillColor(BODY).text('A role-by-role program to take every member of staff from new to confident in two weeks.', M, 296, { width: 420, lineGap: 3 });
  doc.moveTo(M, 334).lineTo(M + 46, 334).lineWidth(2).stroke(ACCENT);
  const meta = [['Program', '2 weeks (10 working days)'], ['Format', 'Daily: common session + track session'], ['Audience', 'All roles'], ['Version', '1.0'], ['Date', DATE], ['Prepared by', 'EnglesTech Plc']];
  let my = 366;
  for (const [k, v] of meta) {
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(k, M, my, { width: 120, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(v, M + 130, my, { width: 300, lineBreak: false });
    my += 19;
  }
  doc.font('Helvetica').fontSize(8.8).fillColor(MUTED).text('Every participant leaves able to do their own job in the system, and read the manual for anything else.', M, PH - 110, { width: 420, lineGap: 4.5 });
  doc.moveTo(M, PH - 60).lineTo(PW - M, PH - 60).lineWidth(0.7).stroke(BORDER);

  // page 2: how the program works
  doc.addPage(); setY(TOP); chapterHead('Program', 'How the two weeks work');
  para('Each of the ten days has two blocks. The morning block is shared by everyone, or by the roles that need it, and covers a topic the whole school depends on. The afternoon block is a track session where each role learns the screens it actually uses.', { size: 10.4 });
  h2('The daily shape');
  table(['Block', 'Who', 'What happens'], [
    ['Morning · 8:30–10:30', 'Whole school or a named track', 'One topic, taught the same way to everyone, with a live demonstration on the system.'],
    ['Afternoon · 10:45–12:15', 'Role tracks', 'Each role learns its own screens and workflows, with practice on real data.'],
  ]);
  h2('What everyone gets, every day');
  ul('A live demonstration before any hands-on work — watch once, then do.',
    'Practice on real school data rather than a sandbox, because that is where the learning transfers.',
    'The in-app User Manual and the printed manual open on the same device, used as the reference.',
    'A short end-of-day check that the day’s outcome was achieved.');
  h2('Who teaches');
  ul('The Administrator or a nominated Owner opens each day and keeps time.',
    'The subject owner for that block leads the hands-on: HR for people, Finance for money, the Principal for academics, the Librarian for the library, Operations/Security for the registers.',
    'Every participant signs in with their own account — never a shared login.');
  note('If a session runs over, protect the afternoon track block. The morning common sessions can be trimmed to the headline points, but each role must get its own hands-on time.');

  // day-by-day
  doc.addPage(); setY(TOP); chapterHead('Day by day', 'The ten days');
  DAYS_FULL.forEach((d) => {
    need(150);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(ACCENT).text(`Day ${d.day} — ${d.title}`, C_X, y, { width: C_W });
    setY(y + 20);
    for (const blk of [d.am, d.pm]) {
      const h = doc.font('Helvetica').fontSize(9.8).heightOfString(blk.detail, { width: C_W - 150, lineGap: 4 }) + 34;
      need(h + 6);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text(blk.topic, C_X + 150, y, { width: C_W - 150 });
      doc.font('Helvetica').fontSize(8.8).fillColor(ACCENT).text(blk.who, C_X, y, { width: 142 });
      doc.font('Helvetica').fontSize(9.8).fillColor(BODY).text(blk.detail, C_X + 150, y + 13, { width: C_W - 150, lineGap: 4 });
      setY(y + 13 + doc.heightOfString(blk.detail, { width: C_W - 150, lineGap: 4 }) + 6);
    }
    doc.font('Helvetica-Oblique').fontSize(9.4).fillColor(MUTED).text(`Outcome: ${d.out}`, C_X + 150, y, { width: C_W - 150 });
    setY(y + doc.heightOfString(`Outcome: ${d.out}`, { width: C_W - 150 }) + 16);
    doc.moveTo(C_X, y).lineTo(C_X + C_W, y).lineWidth(0.5).stroke(BORDER);
    setY(y + 16);
  });

  // role plans
  doc.addPage(); setY(TOP); chapterHead('Role tracks', 'What each role attends');
  para('Use this to confirm, before the program starts, that everyone can attend the sessions their role depends on. A role marked for a day attends both that day’s common content and its own track block.', { size: 10.2 });
  const roleRows = Object.entries(ROLE_PLAN).map(([role, plan]) => [
    ROLE_LABELS[role] || role,
    plan.days.map((d) => `D${d}`).join(' · '),
    plan.note,
  ]);
  table(['Role', 'Days', 'Focus for this role'], roleRows);

  // assessment
  doc.addPage(); setY(TOP); chapterHead('Assessment', 'Sign-off by role');
  para('On day 10 each participant completes one practical task in their own role. It is marked pass/fail against the evidence column, and a short written feedback box is completed by the trainer.', { size: 10.2 });
  table(['Role', 'Practical task', 'Evidence that it is correct'], ASSESSMENT);
  h2('Sign-off');
  table(['Participant', 'Role', 'Tasks passed', 'Trainer', 'Date'], [
    ['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', ''],
    ['', '', '', '', ''], ['', '', '', '', ''],
  ]);
  note('Keep completed sign-off sheets with the training record. They are the evidence that each person can operate their part of the system before they are given live responsibility.');

  // prep checklist
  doc.addPage(); setY(TOP); chapterHead('Before day 1', 'Preparation checklist');
  para('Two weeks is short. These items, done in the week before the program, are what make it work.', { size: 10.2 });
  steps(
    'Confirm every participant has a user account with the correct role, and that they have signed in at least once.',
    'Print or share the User Manual and this program with all participants on day 0.',
    'Choose and brief the trainers for each block — HR, Finance, Principal, Librarian, Operations.',
    'Agree the practice data for day 10 so that real work gets done, not duplicated.',
    'Schedule the daily rooms/links and protect the two blocks from interruption.',
    'Prepare one backup before the program and know how to restore it.',
    'Publish the role-day table (page 4) to participants so nobody misses a session they need.',
    'Agree the pass mark and who signs off, so day 10 ends with a clear decision for every person.'
  );

  // footers
  const range = doc.bufferedPageRange();
  for (let i = 1; i < range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
      .text('School Management System  ·  2-Week Training Program  ·  EnglesTech Plc', M, PH - 34, { width: 340, lineBreak: false });
    const s = String(i + 1), w = doc.font('Helvetica').fontSize(7.5).widthOfString(s);
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(s, PW - M - w - 2, PH - 34, { width: w + 4, align: 'right', lineBreak: false });
  }
  return doc;
}

const doc = render();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
doc.pipe(fs.createWriteStream(OUT));
doc.end();
console.log('PDF written to', OUT);