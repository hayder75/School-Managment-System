/* eslint-disable no-console */
/**
 * Mount Olive School — full reseed from /home/hayder/sms/data/parsed/*.json
 *
 * Wipes all data and seeds the tenant "Mount Olive School" with:
 *  - staff (teachers, KG staff, supportive, management, payroll staff)
 *  - students (2,128 primary + 759 KG) as user accounts + student records
 *  - enrollments (2025/2026), classes, subjects, teacher_subjects
 *  - parents (deduped by guardian phone) + student_parents links
 *  - fee structures, salary grades, tax brackets, June 2018 payroll
 *
 * Usage: node scripts/seed-mount-olive.js
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const knex = require('knex')(require('../src/database/knexfile').development);

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'parsed');
const TID = '00000000-0000-0000-0000-000000000001';

function uid(seed) {
  const hex = crypto.createHash('md5').update(String(seed)).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

async function wipeAll(db) {
  const tables = await db.raw(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'knex%'`
  );
  const names = tables.rows.map((r) => r.tablename);
  await db.raw(`TRUNCATE TABLE ${names.map((n) => `"${n}"`).join(', ')} CASCADE`);
}

const GRADE_MAP = {
  Nursery: { level_group: 'nursery', grade_level: 0, label: 'Nursery' },
  LKG: { level_group: 'kg', grade_level: 1, label: 'LKG' },
  UKG: { level_group: 'kg', grade_level: 2, label: 'UKG' },
};

function parseGrades(classesStr) {
  if (!classesStr) return [];
  const s = String(classesStr);
  const grades = [];
  for (let g = 1; g <= 8; g++) grades.push(g);
  return grades.filter((g) => s.includes(String(g)));
}

async function main() {
  const PASSWORD_HASH = await bcrypt.hash('1234', 10);

  const studentsPrimary = load('students_primary.json');
  const enrollPrimary = load('enroll_primary.json');
  const enrollKg = load('enroll_kg.json');
  const staffJson = load('staff.json');
  const payrollJson = load('payroll.json');

  // ── 0. Wipe everything ──
  console.log('Wiping database…');
  await wipeAll(knex);

  // ── 1. Tenant + super admin ──
  console.log('Seeding tenant + super admin…');
  await knex('tenants').insert({
    id: TID,
    name: 'Mount Olive School',
    slug: 'mount-olive-school',
    email: 'info@mountolive.edu.et',
    phone: '+251-46-212-3456',
    address: 'Hawassa, Ethiopia',
    subscription_plan: 'premium',
    status: 'active',
  });

  await knex('users').insert({
    id: '00000000-0000-0000-0000-000000000001',
    tenant_id: null,
    email: 'super@demo.com',
    password_hash: PASSWORD_HASH,
    first_name: 'Hayder',
    last_name: 'Astedadari',
    role: 'super_admin',
    username: 'superadmin',
    status: 'active',
  });

  const { seedTenant } = require('../src/modules/roles/roles.seed');
  await seedTenant(knex, TID);

  // ── 2. Academic year 2025/2026 + terms ──
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

  // ── 3. Classes from enrollment data ──
  console.log('Seeding classes…');
  const classKey = (levelGroup, section) => `${levelGroup}|${section}`;
  const classMap = new Map(); // key -> {id, name, grade_level, level_group, section}
  const gradeLabelToLevel = {};
  for (const g of ['Nursery', 'LKG', 'UKG']) gradeLabelToLevel[g] = g;

  function ensureClass(gradeLabel, section) {
    const meta = GRADE_MAP[gradeLabel];
    const key = classKey(gradeLabel, section);
    if (classMap.has(key)) return classMap.get(key);
    const id = uid(`class-${gradeLabel}-${section}`);
    const name = gradeLabel.startsWith('Grade') ? `${gradeLabel} ${section}` : `${gradeLabel} ${section}`;
    const rec = {
      id, tenant_id: TID, academic_year_id: yearId,
      name: name.trim(),
      grade_level: meta ? meta.grade_level : parseInt(gradeLabel.replace('Grade ', ''), 10),
      section,
      capacity: 40,
      level_group: meta ? meta.level_group : 'primary',
    };
    classMap.set(key, rec);
    return rec;
  }

  // KG classes
  for (const e of enrollKg) {
    if (e.grade_level && e.section) ensureClass(e.grade_level, e.section);
  }
  // Primary classes
  for (const e of enrollPrimary) {
    if (e.grade_level && e.section) ensureClass(e.grade_level, e.section);
  }

  const classRows = [...classMap.values()];
  await knex.batchInsert('classes', classRows, 100);
  console.log(`  classes created: ${classRows.length}`);

  const classIdByKey = new Map([...classMap.entries()].map(([k, v]) => [k, v.id]));

  // ── 4. Subjects (from period sheet + teacher subjects) ──
  console.log('Seeding subjects…');
  const subjectList = [
    { name: 'Amharic', code: 'AMH' },
    { name: 'English', code: 'ENG' },
    { name: 'Mathematics', code: 'MATH' },
    { name: 'Science', code: 'SCI' },
    { name: 'Social Studies', code: 'SOS' },
    { name: 'Moral & Social', code: 'MORAL' },
    { name: 'Performing Visual Arts', code: 'PVA' },
    { name: 'Physical Education (HPE)', code: 'HPE' },
    { name: 'Sidamu Afo', code: 'SID' },
    { name: 'Spoken English', code: 'SPOK' },
    { name: 'ICT', code: 'ICT' },
    { name: 'Career & Technical Education', code: 'CTE' },
    { name: 'Art & Aesthetics', code: 'ART' },
    { name: 'Hand Craft', code: 'HAND' },
    { name: 'Health & Social Skills', code: 'HSS' },
    { name: 'Sport', code: 'SPORT' },
  ];
  const subjectRows = subjectList.map((s) => ({
    id: uid(`subject-${s.code}`), tenant_id: TID, name: s.name, code: s.code, is_active: true,
  }));
  await knex.batchInsert('subjects', subjectRows, 50);
  const subjectIdByName = new Map(subjectRows.map((s) => [norm(s.name), s.id]));
  console.log(`  subjects created: ${subjectRows.length}`);

  // ── 5. Staff users ──
  console.log('Seeding staff…');
  const staffByNorm = new Map(); // norm(name) -> {name, first, last, role, job_title, qualification, field_of_study, gender, subject, classes}
  let staffSeq = 0;

  function ensureStaff(name, opts = {}) {
    if (!name) return null;
    const key = norm(name);
    if (staffByNorm.has(key)) {
      const existing = staffByNorm.get(key);
      if (!existing.role || existing.role === 'support') existing.role = opts.role || existing.role;
      if (opts.subject) existing.subject = existing.subject || opts.subject;
      if (opts.classes) existing.classes = existing.classes || opts.classes;
      return existing;
    }
    const rec = {
      name,
      first: name.split(' ')[0] || name,
      last: name.split(' ').slice(1).join(' ') || '',
      role: opts.role || 'support',
      job_title: opts.job_title || '',
      qualification: opts.qualification || '',
      field_of_study: opts.field_of_study || '',
      gender: opts.gender || null,
      subject: opts.subject || '',
      classes: opts.classes || '',
      email: `staff${String(++staffSeq).padStart(3, '0')}@mountolive.edu.et`,
      username: `staff${String(staffSeq).padStart(3, '0')}`,
      phone: `+251-91-000-${String(staffSeq).padStart(4, '0')}`,
    };
    staffByNorm.set(key, rec);
    return rec;
  }

  // Management
  const mgmtRoles = {
    'Head Director': 'admin',
    'V/director': 'admin',
    'Quality educ head': 'admin',
    'Unit Leader': 'teacher',
    'Plan &Budget': 'finance',
    'Plan & Budget': 'finance',
  };
  for (const m of staffJson.management) {
    const role = mgmtRoles[m.position] || 'admin';
    ensureStaff(m.name, { role, job_title: m.position, qualification: m.qualification, field_of_study: m.subject, gender: m.sex });
  }

  // Primary teachers
  for (const t of staffJson.primary_teachers) {
    ensureStaff(t.name, {
      role: 'teacher', job_title: 'Teacher', qualification: t.qualification,
      field_of_study: t.field_of_study, gender: t.sex, subject: t.subject, classes: t.classes,
    });
  }

  // KG staff
  for (const t of staffJson.kg_staff) {
    ensureStaff(t.name, {
      role: 'teacher', job_title: 'KG Teacher', qualification: t.qualification,
      field_of_study: t.field_of_study, gender: t.sex, subject: t.subject, classes: t.classes,
    });
  }

  // Supportive
  const supportRoleByPosition = {
    'Finance head': 'finance', 'Ass finance head': 'finance', 'cashier': 'finance', 'Accountant': 'finance',
    'Human resource': 'hr', 'Librerian': 'support', 'store keeper': 'support', 'Secretary': 'support',
    'Guard': 'support', 'Janitor': 'support', 'copier': 'support', 'Ass/ teacher': 'teacher',
  };
  for (const s of staffJson.supportive) {
    const role = supportRoleByPosition[s.position] || 'support';
    ensureStaff(s.name, {
      role, job_title: s.position, qualification: s.qualification, field_of_study: s.field_of_study, gender: s.sex,
    });
  }

  // Payroll-only staff (from payroll sheets)
  for (const sheet of Object.keys(payrollJson)) {
    for (const p of payrollJson[sheet]) {
      if (!p.name) continue;
      const role = sheet.startsWith('KG') || sheet === 'Teachers' ? 'teacher'
        : sheet === 'Admin_2' || sheet === 'ADMIN_1' ? 'admin'
          : 'support';
      ensureStaff(p.name, { role, job_title: p.job_title || sheet });
    }
  }

  const staffRows = [...staffByNorm.values()];
  const staffUsers = [];
  for (const s of staffRows) {
    const uid_ = uid(`staff-user-${norm(s.name)}`);
    staffUsers.push({
      id: uid_, tenant_id: TID, email: s.email, password_hash: PASSWORD_HASH,
      first_name: s.first, last_name: s.last, phone: s.phone, role: s.role,
      username: s.username, status: 'active',
      job_title: s.job_title, qualification: s.qualification, field_of_study: s.field_of_study,
      gender: s.gender,
    });
  }
  await knex.batchInsert('users', staffUsers, 100);
  const staffUserIdByNorm = new Map(staffUsers.map((u) => [norm(u.first_name + ' ' + u.last_name), u.id]));
  // Also map staff records to their user id
  for (const s of staffRows) s.user_id = staffUserIdByNorm.get(norm(s.name));
  console.log(`  staff users created: ${staffUsers.length}`);

  // ── 6. Salary grades + tax brackets ──
  console.log('Seeding salary grades + tax brackets…');
  const salaryGrades = [
    { name: 'Entry Level', basic: 5750 },
    { name: 'Junior Staff', basic: 8322 },
    { name: 'Senior Teacher', basic: 12910 },
    { name: 'Department Head', basic: 39200 },
    { name: 'Principal', basic: 73000 },
  ];
  const salaryGradeRows = salaryGrades.map((g) => ({
    id: uid(`sg-${norm(g.name)}`), tenant_id: TID, name: g.name, basic_salary: g.basic, is_active: true,
  }));
  await knex.batchInsert('salary_grades', salaryGradeRows, 10);

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
      id: uid(`tax-${b.min_salary}`), tenant_id: TID,
      min_salary: b.min_salary, max_salary: b.max_salary, rate: b.rate, deduction: b.deduction, is_active: true,
    });
  }

  // ── 7. Students (primary + KG) ──
  console.log('Seeding students…');
  const enrollById = new Map();
  for (const e of enrollPrimary) enrollById.set(e.student_id, e);
  for (const e of enrollKg) enrollById.set(e.student_id, e);

  const allEnrollments = [...enrollPrimary, ...enrollKg];
  const userRows = [];
  const studentRows = [];
  const enrollmentRows = [];
  let studentSeq = 0;

  const primBySid = new Map(studentsPrimary.map((s) => [s.student_id, s]));

  for (const e of allEnrollments) {
    const basic = primBySid.get(e.student_id) || {};
    studentSeq += 1;
    const seq = studentSeq;
    const userId = uid(`student-user-${e.student_id}`);
    const firstName = basic.first_name || e.first_name || e.student_id;
    const father = basic.father_name || '';
    const lastName = father || '';
    const phone = `+251-91-000-${String(seq).padStart(4, '0')}`;

    userRows.push({
      id: userId, tenant_id: TID,
      email: `student${String(seq).padStart(4, '0')}@mountolive.edu.et`,
      password_hash: PASSWORD_HASH,
      first_name: firstName, last_name: lastName,
      phone, role: 'student', username: `stu${String(seq).padStart(4, '0')}`,
      status: 'active',
    });

    const studentId = uid(`student-rec-${e.student_id}`);
    const gradeLabel = e.grade_level;
    const clsKey = classKey(gradeLabel, e.section);
    const classId = classIdByKey.get(clsKey);

    studentRows.push({
      id: studentId, tenant_id: TID, user_id: userId,
      student_number: e.student_id,
      class_id: classId || null,
      enrollment_date: '2025-09-01',
      status: 'active',
      admission_type: basic.admission_type || 'new',
      date_of_birth: basic.dob || null,
      gender: basic.sex ? (basic.sex === 'Male' ? 'male' : 'female') : null,
      father_name: basic.father_name || null,
      grandfather_name: basic.grandfather_name || null,
      mother_name: basic.mother_name || null,
      nationality: basic.nationality || null,
      country_of_birth: basic.country_of_birth || null,
      region_of_residence: basic.region_of_residence || null,
      zone_of_residence: basic.zone_of_residence || null,
      woreda_of_residence: basic.woreda_of_residence || null,
      region_of_birth: basic.region_of_birth || null,
      zone_of_birth: basic.zone_of_birth || null,
      woreda_of_birth: basic.woreda_of_birth || null,
      kebele: basic.family_kebele || null,
      location_type: basic.location_type || null,
      disability: basic.disability || false,
      disability_type: basic.disability_type || null,
      economic_status: basic.economic_status || null,
      national_id: basic.national_id || null,
      parent_status: basic.parent_status || null,
      family_head_gender: basic.family_head_gender || null,
      emergency_contact: basic.guardian_phone || null,
    });

    enrollmentRows.push({
      id: uid(`enroll-${e.student_id}`), tenant_id: TID,
      student_id: studentId,
      academic_year_id: yearId,
      class_id: classId || null,
      grade_level: gradeLabel,
      section: e.section || null,
      admission_category: e.admission_category || null,
      admission_modality: e.admission_modality || null,
      education_stream: e.education_stream || null,
      cte_field_1: e.cte_field_1 || null,
      cte_field_2: e.cte_field_2 || null,
      num_textbooks: e.num_textbooks || null,
      instructional_language: e.instructional_language || null,
      school_feeding: !!e.school_feeding,
      food_ration_home: !!e.food_ration_home,
      meals_per_week: e.meals_per_week || null,
    });
  }

  await knex.batchInsert('users', userRows, 200);
  await knex.batchInsert('students', studentRows, 200);
  await knex.batchInsert('enrollments', enrollmentRows, 200);
  console.log(`  student user accounts: ${userRows.length}`);
  console.log(`  student records: ${studentRows.length}`);
  console.log(`  enrollments: ${enrollmentRows.length}`);

  const studentIdBySid = new Map(enrollmentRows.map((r, i) => [allEnrollments[i].student_id, r.student_id]));

  // ── 8. Parents (dedup by guardian phone) ──
  console.log('Seeding parents…');
  const parentByKey = new Map(); // key = norm(phone)||norm(name) -> {id, email, username, phone, first, last}
  const studentParentRows = [];
  let parentSeq = 0;

  function ensureParent(guardianName, guardianPhone) {
    const key = guardianPhone ? `p:${norm(guardianPhone)}` : `n:${norm(guardianName)}`;
    if (parentByKey.has(key)) return parentByKey.get(key);
    parentSeq += 1;
    const name = guardianName || `Guardian ${parentSeq}`;
    const first = name.split(' ')[0] || name;
    const last = name.split(' ').slice(1).join(' ') || '';
    const rec = {
      id: uid(`parent-user-${key}`),
      email: `parent${String(parentSeq).padStart(4, '0')}@mountolive.edu.et`,
      username: `parent${String(parentSeq).padStart(4, '0')}`,
      phone: guardianPhone || `+251-91-000-${String(parentSeq).padStart(4, '0')}`,
      first_name: first, last_name: last,
      name,
    };
    parentByKey.set(key, rec);
    return rec;
  }

  const parentUserRows = [];
  for (const s of studentsPrimary) {
    if (!s.guardian_name && !s.guardian_phone) continue;
    const par = ensureParent(s.guardian_name, s.guardian_phone);
    if (!parentUserRows.find((p) => p.id === par.id)) parentUserRows.push(par);
  }

  const parentUserInsertRows = parentUserRows.map((p) => ({
    id: p.id, tenant_id: TID, email: p.email, password_hash: PASSWORD_HASH,
    first_name: p.first_name, last_name: p.last_name, phone: p.phone,
    role: 'parent', username: p.username, status: 'active',
  }));
  await knex.batchInsert('users', parentUserInsertRows, 100);
  console.log(`  parent accounts created: ${parentUserInsertRows.length}`);

  for (const s of studentsPrimary) {
    const studentId = studentIdBySid.get(s.student_id);
    if (!studentId) continue;
    const par = s.guardian_name || s.guardian_phone
      ? ensureParent(s.guardian_name, s.guardian_phone) : null;
    if (!par) continue;
    const relationship = s.family_head_gender === 'Female' ? 'mother'
      : s.family_head_gender === 'Male' ? 'father' : 'guardian';
    const education_level = relationship === 'mother' ? s.mother_education : relationship === 'father' ? s.father_education : s.father_education || s.mother_education;
    studentParentRows.push({
      id: uid(`sp-${s.student_id}`), tenant_id: TID,
      student_id: studentId, parent_id: par.id,
      relationship, is_primary: true,
      education_level: education_level || null,
    });
  }
  await knex.batchInsert('student_parents', studentParentRows, 200);
  console.log(`  student-parent links created: ${studentParentRows.length}`);

  // ── 9. Teacher subjects ──
  console.log('Seeding teacher subject assignments…');
  const teacherSubjectRows = [];
  for (const s of staffRows) {
    if (!s.user_id || (s.role !== 'teacher' && s.role !== 'admin')) continue;
    if (!s.subject && !s.classes) continue;
    const subjId = subjectIdByName.get(norm(s.subject));
    if (!subjId) continue;

    let grades = [];
    if (s.classes) {
      grades = parseGrades(s.classes);
    }
    if (!grades.length) {
      const clsMatch = String(s.classes).match(/[1-8]/g);
      grades = clsMatch ? [...new Set(clsMatch.map(Number))].sort() : [];
    }

    const classRowsForGrades = [...classMap.values()].filter((c) =>
      (c.level_group === 'primary' && grades.includes(c.grade_level))
      || (c.level_group === 'kg' && /nursery|kg/i.test(String(s.classes)))
    );

    for (const c of classRowsForGrades) {
      teacherSubjectRows.push({
        id: uid(`ts-${s.user_id}-${c.id}-${subjId}`), tenant_id: TID,
        teacher_id: s.user_id, subject_id: subjId, class_id: c.id, is_primary: false,
      });
    }
  }
  if (teacherSubjectRows.length) {
    await knex.batchInsert('teacher_subjects', teacherSubjectRows, 200);
  }
  console.log(`  teacher subject assignments created: ${teacherSubjectRows.length}`);

  // ── 10. Fee structures ──
  console.log('Seeding fee structures…');
  const feeCategories = [
    { name: 'Tuition Fee', amount: 2500.0, freq: 'termly' },
    { name: 'Development Levy', amount: 500.0, freq: 'yearly' },
    { name: 'Sports & Activities', amount: 300.0, freq: 'termly' },
    { name: 'Laboratory Fee', amount: 200.0, freq: 'termly' },
    { name: 'Library Fee', amount: 150.0, freq: 'termly' },
    { name: 'Transport Fee', amount: 800.0, freq: 'monthly' },
    { name: 'KG Tuition Fee', amount: 1800.0, freq: 'termly' },
  ];
  const feeRows = feeCategories.map((f) => ({
    id: uid(`fee-${norm(f.name)}`), tenant_id: TID, name: f.name,
    amount: f.amount, frequency: f.freq, due_date: '2026-03-15', late_fee: 50.0, is_active: true,
  }));
  await knex.batchInsert('fee_structures', feeRows, 20);
  console.log(`  fee structures created: ${feeRows.length}`);

  // ── 11. Payroll (June 2018) ──
  console.log('Seeding payroll (June 2018)…');
  const salaryGradeIdByBasic = new Map(salaryGradeRows.map((g) => [g.basic_salary, g.id]));
  const payrollRows = [];
  let paySeq = 0;
  const payrollByUser = new Map();
  for (const sheet of Object.keys(payrollJson)) {
    for (const p of payrollJson[sheet]) {
      if (!p.name) continue;
      paySeq += 1;
      const staff = staffByNorm.get(norm(p.name));
      const userId = staff ? staff.user_id : staffUserIdByNorm.get(norm(p.name));
      if (!userId) {
        console.warn(`  !! no user for payroll name: ${p.name} (${sheet})`);
        continue;
      }
      if (payrollByUser.has(userId)) {
        console.warn(`  !! duplicate payroll for ${p.name} (${sheet}) — keeping first, skipping`);
        continue;
      }
      const basic = p.basic_salary || 0;
      const gross = p.gross || basic;
      const _taxable = p.taxable != null ? p.taxable : gross;
      const incomeTax = p.income_tax != null ? p.income_tax : 0;
      const pensionEmp = p.pension_employee != null ? p.pension_employee : basic * 0.07;
      const pensionEmp2 = p.pension_employer != null ? p.pension_employer : basic * 0.11;
      const otherDeductions = (p.eder || 0) + (p.office_loan || 0) + (p.cafe_loan || 0) + (p.school_pay || 0) + (p.ne_starving || 0);
      const deductions = (p.total_deductions != null ? p.total_deductions : incomeTax + pensionEmp + otherDeductions);
      const netPay = p.net_pay != null ? p.net_pay : gross - deductions;
      const allowances = (p.transport_allowance || 0) + (p.housing_allowance || 0) + (p.account_allowance || 0) + (p.phone_allowance || 0);

      const row = {
        id: uid(`payroll-${p.name}-${sheet}`), tenant_id: TID,
        user_id: userId,
        salary_grade_id: salaryGradeIdByBasic.get(salaryGradeRows.reduce((a, b) =>
          Math.abs(a.basic_salary - basic) < Math.abs(b.basic_salary - basic) ? a : b).basic_salary) || null,
        month: 6, year: 2018,
        basic_pay: basic,
        allowances_total: Math.round(allowances * 100) / 100,
        deductions_total: Math.round(deductions * 100) / 100,
        net_pay: Math.round(netPay * 100) / 100,
        income_tax: Math.round(incomeTax * 100) / 100,
        eder: p.eder || 0,
        office_loan: p.office_loan || 0,
        cafe_loan: p.cafe_loan || 0,
        school_pay: p.school_pay || 0,
        pension_employee: Math.round(pensionEmp * 100) / 100,
        pension_employer: Math.round(pensionEmp2 * 100) / 100,
        ne_starving: p.ne_starving || 0,
        transport_allowance: p.transport_allowance || 0,
        overtime: p.overtime || 0,
        back_pay: p.back_pay || 0,
        unit_leader_allowance: p.unit_leader_allowance || 0,
        department_head_allowance: p.department_head_allowance || 0,
        housing_allowance: p.housing_allowance || 0,
        account_allowance: p.account_allowance || 0,
        phone_allowance: p.phone_allowance || 0,
        work_days: p.work_days != null ? Math.round(p.work_days) : null,
        absent_days: p.absent_days != null ? Math.round(p.absent_days) : null,
        status: 'paid',
        paid_date: '2018-06-30',
      };
      payrollRows.push(row);
      payrollByUser.set(userId, row);
    }
  }
  await knex.batchInsert('payroll', payrollRows, 100);
  console.log(`  payroll rows created: ${payrollRows.length}`);

  // ── 12. Settings ──
  await knex('settings').insert({
    id: uid('settings-mount-olive'), tenant_id: TID,
    key: 'school_name',
    value: JSON.stringify('Mount Olive School'),
  });
  await knex('settings').insert({
    id: uid('settings-academic-year'), tenant_id: TID,
    key: 'academic_year_id',
    value: JSON.stringify(yearId),
  });

  // ── Summary ──
  console.log('\n══════════════ SEED COMPLETE ══════════════');
  const cnt = async (t) => (await knex(t).where({ tenant_id: TID }).count('* as c').first()).c;
  console.log('Tenant: Mount Olive School');
  console.log(`Academic years: ${await cnt('academic_years')}`);
  console.log(`Terms: ${await cnt('terms')}`);
  console.log(`Classes: ${await cnt('classes')}`);
  console.log(`Subjects: ${await cnt('subjects')}`);
  console.log(`Users (all roles): ${await cnt('users', { tenant_id: TID })}`);
  console.log(`Staff accounts: ${await cnt('users', { tenant_id: TID, role: 'teacher' })} teachers + others`);
  console.log(`Student accounts: ${await cnt('users', { tenant_id: TID, role: 'student' })}`);
  console.log(`Parent accounts: ${await cnt('users', { tenant_id: TID, role: 'parent' })}`);
  console.log(`Student records: ${await cnt('students')}`);
  console.log(`Enrollments: ${await cnt('enrollments')}`);
  console.log(`Student-parent links: ${await cnt('student_parents')}`);
  console.log(`Teacher subject assignments: ${await cnt('teacher_subjects')}`);
  console.log(`Fee structures: ${await cnt('fee_structures')}`);
  console.log(`Salary grades: ${await cnt('salary_grades')}`);
  console.log(`Tax brackets: ${await cnt('tax_brackets')}`);
  console.log(`Payroll rows: ${await cnt('payroll')}`);
  await knex.destroy();
}

main().catch(async (err) => {
  console.error(err);
  await knex.destroy();
  process.exit(1);
});
