const bcrypt = require('bcrypt');
const crypto = require('crypto');

function uid(seed) {
  const hex = crypto.createHash('md5').update(seed).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

const TID = '00000000-0000-0000-0000-000000000001';
const DEMO_IDS = [
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000016',
];

exports.seed = async function (knex) {
  const hash = await bcrypt.hash('1234', 10);

  // ── Clean existing data in reverse FK order ──
  await knex('notifications').del();
  await knex('chat_messages').del();
  await knex('chat_participants').del();
  await knex('chat_conversations').del();
  await knex('grades').del();
  await knex('attendance').del();
  await knex('timetable_entries').del();
  await knex('payments').del();
  await knex('fee_structures').del();
  await knex('payroll').del();
  await knex('salary_grades').del();
  await knex('tax_brackets').del();
  await knex('expenses').del();
  await knex('announcements').del();
  await knex('audit_logs').del();
  await knex('student_parents').del();
  await knex('teacher_subjects').del();
  await knex('students').del();
  await knex('exams').del();
  await knex('classes').del();
  await knex('subjects').del();
  await knex('terms').del();
  await knex('academic_years').del();
  await knex('branches').del();
  await knex('settings').del();
  await knex('users').where({ tenant_id: TID }).del();

  // ════════════════════════════════════════════
  // 1. USERS (role accounts for login)
  // ════════════════════════════════════════════
  const users = [
    { id: '00000000-0000-0000-0000-000000000010', email: 'owner@demo.com',     first_name: 'Abebe', last_name: 'Bekele',     role: 'owner', phone: '+251-911-000010' },
    { id: '00000000-0000-0000-0000-000000000011', email: 'admin@demo.com',     first_name: 'Ester',   last_name: 'Tadese',     role: 'admin', phone: '+251-911-000011' },
    { id: '00000000-0000-0000-0000-000000000012', email: 'teacher@demo.com',   first_name: 'Yohannes',    last_name: 'Woldemichael',   role: 'teacher', phone: '+251-911-000012' },
    { id: '00000000-0000-0000-0000-000000000013', email: 'student@demo.com',   first_name: 'Markos',    last_name: 'Alemu',     role: 'student', phone: '+251-911-000013' },
    { id: '00000000-0000-0000-0000-000000000014', email: 'parent@demo.com',    first_name: 'Asnake',  last_name: 'Mengasha',    role: 'parent', phone: '+251-911-000014' },
    { id: '00000000-0000-0000-0000-000000000015', email: 'finance@demo.com',   first_name: 'Sara',   last_name: 'Desalegn',   role: 'finance', phone: '+251-911-000015' },
    { id: '00000000-0000-0000-0000-000000000016', email: 'hr@demo.com',        first_name: 'Haftom',   last_name: 'Gebreegziabher',        role: 'hr', phone: '+251-911-000016' },
  ];

  for (const u of users) {
    await knex('users').insert({ ...u, tenant_id: TID, password_hash: hash, status: 'active' });
  }

  // ════════════════════════════════════════════
  // 2. BRANCH
  // ════════════════════════════════════════════
  await knex('branches').insert({
    id: uid('main-branch'),
    tenant_id: TID,
    name: 'Wona Campus',
    address: 'Birhan Adebabay, Addis Ababa, Ethiopia',
    phone: '+251-911-000001',
    is_head_office: true,
  });

  // ════════════════════════════════════════════
  // 3. ACADEMIC YEAR & TERMS
  // ════════════════════════════════════════════
  const yearId = uid('ay-2025-2026');
  await knex('academic_years').insert({
    id: yearId, tenant_id: TID,
    name: '2025-2026 Academic Year',
    start_date: '2025-09-01', end_date: '2026-06-30',
    is_current: true,
  });

  const terms = [
    { name: 'Term 1', start: '2025-09-01', end: '2025-12-20' },
    { name: 'Term 2', start: '2026-01-10', end: '2026-04-10' },
    { name: 'Term 3', start: '2026-04-20', end: '2026-06-30' },
  ];
  const termIds = [];
  for (const t of terms) {
    const tid = uid(`term-${t.name}`);
    termIds.push(tid);
    await knex('terms').insert({
      id: tid, tenant_id: TID, academic_year_id: yearId,
      name: t.name, start_date: t.start, end_date: t.end,
    });
  }

  // ════════════════════════════════════════════
  // 4. CLASSES (Grade 1-8, A/B sections)
  // ════════════════════════════════════════════
  const grades = [
    { level: 1, sections: ['A', 'B'] },
    { level: 2, sections: ['A', 'B'] },
    { level: 3, sections: ['A', 'B'] },
    { level: 4, sections: ['A', 'B'] },
    { level: 5, sections: ['A', 'B'] },
    { level: 6, sections: ['A', 'B'] },
    { level: 7, sections: ['A'] },
    { level: 8, sections: ['A'] },
  ];
  const classIds = [];
  const teacherId = '00000000-0000-0000-0000-000000000012';
  for (const g of grades) {
    for (const sec of g.sections) {
      const cid = uid(`class-${g.level}-${sec}`);
      classIds.push(cid);
      await knex('classes').insert({
        id: cid, tenant_id: TID, academic_year_id: yearId,
        name: `Grade ${g.level} ${sec}`,
        grade_level: g.level, section: sec,
        capacity: 30, class_teacher_id: teacherId,
      });
    }
  }

  // ════════════════════════════════════════════
  // 5. SUBJECTS
  // ════════════════════════════════════════════
  const subjectList = [
    { name: 'Mathematics', code: 'MATH' },
    { name: 'English Language', code: 'ENG' },
    { name: 'Science', code: 'SCI' },
    { name: 'History', code: 'HIST' },
    { name: 'Geography', code: 'GEO' },
    { name: 'Physics', code: 'PHY' },
    { name: 'Chemistry', code: 'CHEM' },
    { name: 'Biology', code: 'BIO' },
    { name: 'Computer Science', code: 'CS' },
    { name: 'Art & Design', code: 'ART' },
    { name: 'Music', code: 'MUS' },
    { name: 'Physical Education', code: 'PE' },
  ];
  const subjectIds = [];
  for (const s of subjectList) {
    const sid = uid(`subject-${s.code}`);
    subjectIds.push(sid);
    await knex('subjects').insert({
      id: sid, tenant_id: TID, name: s.name, code: s.code, is_active: true,
    });
  }

  // ════════════════════════════════════════════
  // 6. TEACHER SUBJECTS (assign teacher to Math & Science for Grade 1A)
  // ════════════════════════════════════════════
  for (let i = 0; i < Math.min(4, subjectIds.length); i++) {
    await knex('teacher_subjects').insert({
      id: uid(`ts-${i}`), tenant_id: TID,
      teacher_id: teacherId, subject_id: subjectIds[i],
      class_id: classIds[0], is_primary: i === 0,
    });
  }

  // ════════════════════════════════════════════
  // 7. STUDENTS (1 demo + 25 extra)
  // ════════════════════════════════════════════
  const studentNames = [
    'Markos Alemu',
    'Almaz Work', 'Birhane Haile', 'Tesfaye Bekele', 'Dink Nega',
    'Elizabet Wolde', 'Fikru Mekonnen', 'Gebre Lukas', 'Hana Muluneh',
    'Iyasu Desalegn', 'Yodabe Tesfaye', 'Kassahun Belachew', 'Lalibela Negash',
    'Mulu Assefa', 'Nathanel Wolde', 'Olivia Tamrat', 'Paulos Gebre',
    'Kidist Haile', 'Rahel Desalegn', 'Selassie Wolde', 'Tamrat Haile',
    'Uma Takle', 'Victor Haile', 'Wendimu Tesfaye', 'Chale Shiferaw',
    'Yara Shahidi',
  ];

  const adminId = '00000000-0000-0000-0000-000000000011';
  const studentUserIds = [];
  const studentRecIds = [];
  for (let i = 0; i < studentNames.length; i++) {
    const nameParts = studentNames[i].split(' ');
    const isDemo = i === 0;
    const sid = isDemo
      ? '00000000-0000-0000-0000-000000000013'
      : uid(`student-user-${i}`);

    if (!isDemo) {
      await knex('users').insert({
        id: sid, tenant_id: TID,
        email: `student${i}@demo.edu`,
        password_hash: null,
        first_name: nameParts[0], last_name: nameParts[1],
        role: 'student', status: 'active',
        phone: `+1-555-02${String(i).padStart(2, '0')}`,
      });
    }

    const studentRecId = uid(`student-rec-${i}`);
    studentUserIds.push(sid);
    studentRecIds.push(studentRecId);
    const clsIdx = i % classIds.length;
    const statuses = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'graduated'];
    await knex('students').insert({
      id: studentRecId, tenant_id: TID, user_id: sid,
      student_number: `DEMO-${String(i + 1).padStart(4, '0')}`,
      class_id: classIds[clsIdx],
      enrollment_date: '2025-09-01',
      status: statuses[i] || 'active',
      emergency_contact: `+1-555-999${String(i).padStart(2, '0')}`,
    });
  }

  // ════════════════════════════════════════════
  // 8. STUDENT PARENT (link parent to Jane Student)
  // ════════════════════════════════════════════
  await knex('student_parents').insert({
    id: uid('sp-1'), tenant_id: TID,
    student_id: studentRecIds[0],
    parent_id: '00000000-0000-0000-0000-000000000014',
    relationship: 'father', is_primary: true,
  });

  // ════════════════════════════════════════════
  // 9. FEE STRUCTURES
  // ════════════════════════════════════════════
  const feeCategories = [
    { name: 'Tuition Fee', amount: 2500.00, freq: 'termly' },
    { name: 'Development Levy', amount: 500.00, freq: 'yearly' },
    { name: 'Sports & Activities', amount: 300.00, freq: 'termly' },
    { name: 'Laboratory Fee', amount: 200.00, freq: 'termly' },
    { name: 'Library Fee', amount: 150.00, freq: 'termly' },
    { name: 'Transport Fee', amount: 800.00, freq: 'monthly' },
    { name: 'Boarding Fee', amount: 1500.00, freq: 'termly' },
  ];
  const feeStructureIds = [];
  for (const f of feeCategories) {
    const fid = uid(`fee-${f.name}`);
    feeStructureIds.push(fid);
    await knex('fee_structures').insert({
      id: fid, tenant_id: TID, name: f.name,
      amount: f.amount, frequency: f.freq,
      due_date: '2026-03-15', late_fee: 50.00, is_active: true,
    });
  }

  // ════════════════════════════════════════════
  // 10. PAYMENTS (mix of paid/pending)
  // ════════════════════════════════════════════
  for (let i = 0; i < studentUserIds.length && i < 20; i++) {
    const numFees = 1 + (i % 3);
    for (let j = 0; j < numFees && j < feeStructureIds.length; j++) {
      const isPaid = (i + j) % 3 !== 0;
      const amt = parseFloat(feeCategories[j].amount);
      await knex('payments').insert({
        id: uid(`payment-${i}-${j}`), tenant_id: TID,
        student_id: studentUserIds[i],
        fee_structure_id: feeStructureIds[j],
        amount_paid: isPaid ? amt : amt * 0.5,
        balance: isPaid ? 0 : amt * 0.5,
        due_date: '2026-03-15',
        paid_date: isPaid ? '2026-03-10' : null,
        status: isPaid ? 'paid' : 'partial',
        payment_method: ['cash', 'bank_transfer', 'card'][i % 3],
        remarks: isPaid ? 'Full payment' : 'Partial payment',
      });
    }
  }

  // ════════════════════════════════════════════
  // 11. EXPENSES
  // ════════════════════════════════════════════
  const expenseCategories = ['Utilities', 'Supplies', 'Maintenance', 'Salaries', 'Transport', 'Food', 'Events', 'Technology', 'Other'];
  const expenseDesc = [
    'Monthly electricity bill',
    'Office stationery supplies',
    'Classroom furniture repair',
    'Teacher salary disbursement',
    'School bus fuel',
    'Cafeteria supplies',
    'Annual sports day event',
    'Computer lab upgrade',
    'Miscellaneous expenses',
  ];
  for (let i = 0; i < 25; i++) {
    const idx = i % expenseCategories.length;
    await knex('expenses').insert({
      id: uid(`expense-${i}`), tenant_id: TID,
      category: expenseCategories[idx],
      description: expenseDesc[idx],
      amount: Math.round((200 + Math.random() * 5000) * 100) / 100,
      expense_date: new Date(2026, 0, 1 + i * 7).toISOString().split('T')[0],
      paid_to: ['City Power Corp', 'Office Mart', 'Fix-It Services', 'Staff', 'Gas Station', 'Food Supply Co', 'Event Planners', 'TechWorld', 'Misc'][idx],
      created_by: adminId,
    });
  }

  // ════════════════════════════════════════════
  // 12. SALARY GRADES & PAYROLL
  // ════════════════════════════════════════════
  const salaryGradeIds = [];
  const gradesInfo = [
    { name: 'Entry Level', basic: 1500 },
    { name: 'Junior Staff', basic: 2500 },
    { name: 'Senior Staff', basic: 3500 },
    { name: 'Department Head', basic: 5000 },
    { name: 'Principal', basic: 7000 },
  ];
  for (const g of gradesInfo) {
    const gid = uid(`sg-${g.name}`);
    salaryGradeIds.push(gid);
    await knex('salary_grades').insert({
      id: gid, tenant_id: TID, name: g.name,
      basic_salary: g.basic, is_active: true,
    });
  }

  // Payroll for teacher
  const payrollUsers = [
    { uid: teacherId, sg: salaryGradeIds[2], basic: 3500 },
    { uid: adminId, sg: salaryGradeIds[3], basic: 5000 },
  ];
  for (const pu of payrollUsers) {
    const overtime = 0;
    const taxable = pu.basic + overtime;
    const incomeTax = taxable <= 2000 ? 0 : taxable <= 4000 ? taxable * 0.15 - 300 : taxable <= 7000 ? taxable * 0.2 - 500 : taxable <= 10000 ? taxable * 0.25 - 850 : taxable <= 14000 ? taxable * 0.3 - 1350 : taxable * 0.35 - 2050;
    const pensionEmployee = pu.basic * 0.07;
    const pensionEmployer = pu.basic * 0.11;
    const deductionsTotal = incomeTax + pensionEmployee;
    const netPay = pu.basic + 300 - deductionsTotal;
    for (let m = 1; m <= 6; m++) {
      await knex('payroll').insert({
        id: uid(`payroll-${pu.uid}-${m}`), tenant_id: TID,
        user_id: pu.uid, salary_grade_id: pu.sg,
        month: m, year: 2026,
        basic_pay: pu.basic,
        allowances_total: 300,
        deductions_total: Math.round(deductionsTotal * 100) / 100,
        net_pay: Math.round(netPay * 100) / 100,
        income_tax: Math.round(incomeTax * 100) / 100,
        pension_employee: Math.round(pensionEmployee * 100) / 100,
        pension_employer: Math.round(pensionEmployer * 100) / 100,
        status: m < 6 ? 'paid' : 'pending',
        paid_date: m < 6 ? new Date(2026, m, 5).toISOString().split('T')[0] : null,
      });
    }
  }

  // ════════════════════════════════════════════
  // 12b. TAX BRACKETS (Ethiopian PAYE, matches JUNE SALARY 2018.xlsx)
  // ════════════════════════════════════════════
  const taxBrackets = [
    { min_salary: 0, max_salary: 2000, rate: 0, deduction: 0 },
    { min_salary: 2000, max_salary: 4000, rate: 15, deduction: 300 },
    { min_salary: 4000, max_salary: 7000, rate: 20, deduction: 500 },
    { min_salary: 7000, max_salary: 10000, rate: 25, deduction: 850 },
    { min_salary: 10000, max_salary: 14000, rate: 30, deduction: 1350 },
    { min_salary: 14000, max_salary: null, rate: 35, deduction: 2050 },
  ];
  for (const b of taxBrackets) {
    await knex('tax_brackets').insert({
      id: uid(`tax-${b.min_salary}`),
      tenant_id: TID,
      min_salary: b.min_salary,
      max_salary: b.max_salary,
      rate: b.rate,
      deduction: b.deduction,
      is_active: true,
    });
  }

  // ════════════════════════════════════════════
  // 13. ATTENDANCE (last 3 weeks)
  // ════════════════════════════════════════════
  const statuses = ['present', 'present', 'present', 'present', 'present', 'absent', 'late', 'present', 'present', 'excused'];
  for (let dayOffset = 21; dayOffset >= 0; dayOffset--) {
    const d = new Date(2026, 6, 26 - dayOffset);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dateStr = d.toISOString().split('T')[0];
    for (let s = 0; s < Math.min(15, studentUserIds.length); s++) {
      const status = statuses[(s + dayOffset) % statuses.length];
      await knex('attendance').insert({
        id: uid(`att-${s}-${dayOffset}`), tenant_id: TID,
        student_id: studentUserIds[s],
        class_id: classIds[s % classIds.length],
        date: dateStr, status,
        marked_by: teacherId,
      });
    }
  }

  // ════════════════════════════════════════════
  // 14. EXAMS
  // ════════════════════════════════════════════
  const examTypes = ['midterm', 'final', 'quiz', 'assignment'];
  const examNames = ['Mid-Term Examination', 'Final Examination', 'Weekly Quiz', 'Term Project'];
  const examIds = [];
  for (let i = 0; i < 8; i++) {
    const eid = uid(`exam-${i}`);
    examIds.push(eid);
    const typeIdx = i % 4;
    await knex('exams').insert({
      id: eid, tenant_id: TID,
      name: `${examNames[typeIdx]} - ${subjectList[i % subjectList.length].name}`,
      type: examTypes[typeIdx],
      class_id: classIds[i % classIds.length],
      subject_id: subjectIds[i % subjectIds.length],
      term_id: termIds[0],
      date: new Date(2026, 2, 10 + i * 5).toISOString().split('T')[0],
      total_marks: 100, pass_marks: 40,
    });
  }

  // ════════════════════════════════════════════
  // 15. GRADES
  // ════════════════════════════════════════════
  for (let ei = 0; ei < examIds.length; ei++) {
    for (let si = 0; si < Math.min(10, studentUserIds.length); si++) {
      const marks = 30 + Math.round(Math.random() * 70);
      const grade = marks >= 80 ? 'A' : marks >= 65 ? 'B' : marks >= 50 ? 'C' : marks >= 40 ? 'D' : 'F';
      await knex('grades').insert({
        id: uid(`grade-${ei}-${si}`), tenant_id: TID,
        student_id: studentUserIds[si], exam_id: examIds[ei],
        marks_obtained: marks, grade_letter: grade,
      });
    }
  }

  // ════════════════════════════════════════════
  // 16. TIMETABLE
  // ════════════════════════════════════════════
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const slots = [
    { start: '08:00', end: '08:45' },
    { start: '08:50', end: '09:35' },
    { start: '09:45', end: '10:30' },
    { start: '10:35', end: '11:20' },
    { start: '11:30', end: '12:15' },
    { start: '13:00', end: '13:45' },
    { start: '13:50', end: '14:35' },
  ];
  for (let di = 0; di < days.length; di++) {
    for (let si = 0; si < 5; si++) {
      const subjIdx = (di * 5 + si) % subjectIds.length;
      await knex('timetable_entries').insert({
        id: uid(`tt-${days[di]}-${si}`), tenant_id: TID,
        class_id: classIds[0],
        subject_id: subjectIds[subjIdx],
        teacher_id: teacherId,
        day_of_week: days[di],
        start_time: slots[si].start,
        end_time: slots[si].end,
        room: `Room ${100 + si}`,
      });
    }
  }

  // ════════════════════════════════════════════
  // 17. ANNOUNCEMENTS
  // ════════════════════════════════════════════
  const announcements = [
    { title: 'School Re-opening', content: 'School will reopen for Term 2 on January 10th, 2026. All students are expected to report by 8:00 AM.', audience: 'all' },
    { title: 'Parent-Teacher Meeting', content: 'Parent-Teacher meeting scheduled for February 15th, 2026 from 9:00 AM to 12:00 PM.', audience: 'all' },
    { title: 'Science Fair 2026', content: 'Annual Science Fair will be held on March 20th. Interested students should register by March 1st.', audience: 'students' },
    { title: 'Staff Meeting Reminder', content: 'All staff members are requested to attend the monthly meeting on Friday at 3:00 PM in the conference room.', audience: 'teachers' },
    { title: 'Exam Timetable Published', content: 'Mid-term examination timetable has been published. Please check the notice board or student portal.', audience: 'all' },
    { title: 'Sports Day Announcement', content: 'Annual Sports Day will be held on April 5th. Parents are cordially invited to attend.', audience: 'all' },
  ];
  for (let i = 0; i < announcements.length; i++) {
    await knex('announcements').insert({
      id: uid(`ann-${i}`), tenant_id: TID, created_by: adminId,
      title: announcements[i].title,
      content: announcements[i].content,
      audience: announcements[i].audience,
      is_published: true,
      published_at: new Date(2026, 0, 15 + i * 10).toISOString(),
    });
  }

  // ════════════════════════════════════════════
  // 18. NOTIFICATIONS (for demo student)
  // ════════════════════════════════════════════
  const notifs = [
    { title: 'Fee Payment Reminder', message: 'Tuition fee for Term 2 is due by March 15th.' },
    { title: 'Exam Schedule Published', message: 'Mid-term exams start from March 10th. Check the timetable.' },
    { title: 'Attendance Warning', message: 'Your child has been marked absent for 3 consecutive days.' },
    { title: 'Report Card Available', message: 'Term 1 report cards are now available for download.' },
    { title: 'Sports Day Registration', message: 'Register for sports day events by March 25th.' },
  ];
  for (let i = 0; i < notifs.length; i++) {
    await knex('notifications').insert({
      id: uid(`notif-${i}`), tenant_id: TID,
      user_id: '00000000-0000-0000-0000-000000000014',
      title: notifs[i].title, message: notifs[i].message,
      is_read: i < 2,
    });
  }
};
