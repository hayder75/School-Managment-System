#!/usr/bin/env node
/**
 * Seed foundation data: academic year 2019 E.C. + terms, class links,
 * student enrollments, settings defaults, salary grades.
 * Dry-run by default; pass --apply. Usage: node scripts/seed_foundations.js [--apply]
 */
const db = require('../src/config/database');
const APPLY = process.argv.includes('--apply');

const YEAR_NAME = '2019 E.C.';
const YEAR_START = '2026-09-11'; // Meskerem 1, 2019 E.C.
const YEAR_END = '2027-06-30';
const TERMS = [
  { name: 'Semester 1', start: '2026-09-11', end: '2027-01-30' },
  { name: 'Semester 2', start: '2027-02-01', end: '2027-06-30' },
];
const SETTINGS = {
  school_name: 'Mount Olive Academy',
  currency: 'ETB',
  calendar: 'both',
  week_start_day: 'Monday',
  fee_grace_days: 5,
  fee_penalty_type: 'fixed',
  fee_penalty_amount: 100,
};
const SALARY_GRADES = [
  { name: 'Entry Level', basic_salary: 1500 },
  { name: 'Junior Staff', basic_salary: 2500 },
  { name: 'Senior Staff', basic_salary: 3500 },
  { name: 'Department Head', basic_salary: 5000 },
  { name: 'Principal', basic_salary: 7000 },
];

(async () => {
  const tenant = await db('tenants').select('id').first();
  const tenantId = tenant.id;
  const plan = {};

  await db.transaction(async (trx) => {
    // academic year
    let year = await trx('academic_years').where({ tenant_id: tenantId, name: YEAR_NAME }).first();
    if (!year) {
      plan.academicYear = 1;
      if (APPLY) [year] = await trx('academic_years').insert({ tenant_id: tenantId, name: YEAR_NAME, start_date: YEAR_START, end_date: YEAR_END, is_current: true }).returning('*');
      else year = { id: 'NEW' };
    }

    // terms
    plan.terms = 0;
    for (const tm of TERMS) {
      const ex = await trx('terms').where({ tenant_id: tenantId, name: tm.name }).first();
      if (!ex) { plan.terms++; if (APPLY) await trx('terms').insert({ tenant_id: tenantId, academic_year_id: year.id, name: tm.name, start_date: tm.start, end_date: tm.end }); }
    }

    // link classes to the year
    plan.classesLinked = 0;
    if (APPLY) plan.classesLinked = await trx('classes').where({ tenant_id: tenantId }).whereNull('academic_year_id').update({ academic_year_id: year.id });

    // settings
    plan.settings = 0;
    for (const [key, value] of Object.entries(SETTINGS)) {
      const ex = await trx('settings').where({ tenant_id: tenantId, key }).first();
      if (!ex) { plan.settings++; if (APPLY) await trx('settings').insert({ tenant_id: tenantId, key, value: JSON.stringify(value) }); }
    }

    // salary grades
    plan.salaryGrades = 0;
    for (const g of SALARY_GRADES) {
      const ex = await trx('salary_grades').where({ tenant_id: tenantId, name: g.name }).first();
      if (!ex) { plan.salaryGrades++; if (APPLY) await trx('salary_grades').insert({ tenant_id: tenantId, name: g.name, basic_salary: g.basic_salary, is_active: true }); }
    }

    // enrollments + enrollment_date
    const students = await trx('students').where({ tenant_id: tenantId }).whereNot('status', 'archived').select('id', 'class_id');
    plan.enrollments = 0;
    if (APPLY) {
      await trx('students').where({ tenant_id: tenantId }).whereNot('status', 'archived').whereNull('enrollment_date').update({ enrollment_date: YEAR_START });
    }
    for (const s of students) {
      const ex = await trx('enrollments').where({ tenant_id: tenantId, student_id: s.id, academic_year_id: year.id }).first();
      if (ex) continue;
      plan.enrollments++;
      if (APPLY) {
        const cls = s.class_id ? await trx('classes').where({ id: s.class_id }).first() : null;
        await trx('enrollments').insert({
          tenant_id: tenantId, student_id: s.id, academic_year_id: year.id, class_id: s.class_id || null,
          grade_level: cls && cls.grade_level != null ? String(cls.grade_level) : null,
          section: cls ? cls.section : null,
        });
      }
    }
  });

  console.log(JSON.stringify({ mode: APPLY ? 'APPLY' : 'DRY-RUN', plan }, null, 2));
  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
