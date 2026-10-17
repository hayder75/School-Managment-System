#!/usr/bin/env node
/**
 * Seed the standard Ethiopian payroll income-tax brackets (idempotent).
 * These match the brackets used by the seed script. Editable later in
 * Payroll → Tax Brackets. No-op if brackets already exist.
 */
const db = require('../src/config/database');

const BRACKETS = [
  { min_salary: 0, max_salary: 2000, rate: 0, deduction: 0 },
  { min_salary: 2000, max_salary: 4000, rate: 15, deduction: 300 },
  { min_salary: 4000, max_salary: 7000, rate: 20, deduction: 500 },
  { min_salary: 7000, max_salary: 10000, rate: 25, deduction: 850 },
  { min_salary: 10000, max_salary: 14000, rate: 30, deduction: 1350 },
  { min_salary: 14000, max_salary: null, rate: 35, deduction: 2050 },
];

(async () => {
  const tenant = await db('tenants').select('id').first();
  const existing = await db('tax_brackets').where({ tenant_id: tenant.id }).count('* as c').first();
  if (Number(existing.c) > 0) {
    console.log(`Tax brackets already configured (${existing.c}). Nothing to do.`);
    await db.destroy();
    return;
  }
  await db('tax_brackets').insert(BRACKETS.map((b) => ({ ...b, tenant_id: tenant.id, is_active: true })));
  console.log(`Seeded ${BRACKETS.length} tax brackets.`);
  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
