const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function createSalaryGrade(tenantId, data) {
  const [grade] = await db('salary_grades').insert({ ...data, tenant_id: tenantId }).returning('*');
  return grade;
}

async function findAllSalaryGrades(tenantId) {
  return db('salary_grades').where({ tenant_id: tenantId }).orderBy('name');
}

async function updateSalaryGrade(tenantId, id, data) {
  const [grade] = await db('salary_grades').where({ tenant_id: tenantId, id }).update(data).returning('*');
  return grade;
}

async function removeSalaryGrade(tenantId, id) {
  return db('salary_grades').where({ tenant_id: tenantId, id }).del();
}

const ALLOWANCE_FIELDS = ['transport_allowance', 'overtime', 'back_pay', 'unit_leader_allowance', 'department_head_allowance', 'housing_allowance', 'account_allowance', 'phone_allowance'];
const DEDUCTION_FIELDS = ['income_tax', 'eder', 'office_loan', 'cafe_loan', 'school_pay', 'pension_employee', 'ne_starving'];
const EMPLOYER_FIELDS = ['pension_employer'];

function num(v) {
  return parseFloat(v || 0) || 0;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

// === AUTO TAX & PENSION ===
async function getActiveTaxBrackets(tenantId) {
  return db('tax_brackets').where({ tenant_id: tenantId, is_active: true }).orderBy('min_salary');
}

// Ethiopian-style bracket formula: tax = taxable*rate - deduction for the bracket containing `taxable`.
function computeIncomeTax(taxable, brackets) {
  let tax = 0;
  for (const b of brackets) {
    const min = parseFloat(b.min_salary);
    const max = b.max_salary != null ? parseFloat(b.max_salary) : Infinity;
    if (taxable > min && taxable <= max) {
      const rate = parseFloat(b.rate) / 100;
      const deduction = parseFloat(b.deduction) || 0;
      tax = Math.max(0, taxable * rate - deduction);
      break;
    }
  }
  return round2(tax);
}

// Fill income_tax + pension from basic/OT whenever the client didn't supply them.
async function applyAutoCalculations(tenantId, data) {
  const out = { ...data };
  const basic = num(data.basic_pay);
  if (out.income_tax == null) {
    const brackets = await getActiveTaxBrackets(tenantId);
    if (brackets.length) out.income_tax = computeIncomeTax(basic + num(data.overtime), brackets);
  }
  if (out.pension_employee == null && basic > 0) out.pension_employee = round2(basic * 0.07);
  if (out.pension_employer == null && basic > 0) out.pension_employer = round2(basic * 0.11);
  return out;
}

function computeTotals(data) {
  const totals = {};
  if (ALLOWANCE_FIELDS.some((f) => data[f] != null)) {
    totals.allowances_total = ALLOWANCE_FIELDS.reduce((sum, f) => sum + num(data[f]), 0);
  }
  if (DEDUCTION_FIELDS.some((f) => data[f] != null)) {
    totals.deductions_total = DEDUCTION_FIELDS.reduce((sum, f) => sum + num(data[f]), 0);
  }
  if (data.basic_pay != null || totals.allowances_total != null || totals.deductions_total != null) {
    totals.net_pay = num(data.basic_pay ?? 0) + (totals.allowances_total ?? num(data.allowances_total)) - (totals.deductions_total ?? num(data.deductions_total));
  }
  return totals;
}

async function createPayroll(tenantId, data) {
  const enriched = await applyAutoCalculations(tenantId, data);
  const totals = computeTotals(enriched);
  const [entry] = await db('payroll').insert({ ...enriched, ...totals, tenant_id: tenantId }).returning('*');
  return entry;
}

// Preview computed values without saving (used by the UI "Calculate" button).
async function calculatePayroll(tenantId, data) {
  const enriched = await applyAutoCalculations(tenantId, data);
  const totals = computeTotals(enriched);
  return {
    ...enriched,
    ...totals,
    taxable_income: round2(num(data.basic_pay) + num(data.overtime)),
  };
}

async function findAllPayroll(tenantId, { page = 1, limit = 20, month, year, status, user_id } = {}) {
  let query = db('payroll')
    .where({ 'payroll.tenant_id': tenantId })
    .leftJoin('users', 'payroll.user_id', 'users.id')
    .leftJoin('salary_grades', 'payroll.salary_grade_id', 'salary_grades.id')
    .select('payroll.*', 'users.first_name', 'users.last_name', 'users.email', 'users.job_title', 'salary_grades.name as grade_name')
    .orderBy('payroll.year', 'desc')
    .orderBy('payroll.month', 'desc');
  if (month) query = query.where('payroll.month', month);
  if (year) query = query.where('payroll.year', year);
  if (status) query = query.where('payroll.status', status);
  if (user_id) query = query.where('payroll.user_id', user_id);
  return paginatedResult(query, page, limit);
}

async function updatePayroll(tenantId, id, data) {
  const existing = await db('payroll').where({ tenant_id: tenantId, id }).first();
  if (!existing) return undefined;
  const merged = { ...existing, ...data };
  const payChanged = data.basic_pay != null || data.overtime != null;
  const derived = {};
  if (payChanged) {
    if (data.income_tax == null) {
      const brackets = await getActiveTaxBrackets(tenantId);
      if (brackets.length) derived.income_tax = computeIncomeTax(num(merged.basic_pay) + num(merged.overtime), brackets);
    }
    if (data.pension_employee == null) derived.pension_employee = round2(num(merged.basic_pay) * 0.07);
    if (data.pension_employer == null) derived.pension_employer = round2(num(merged.basic_pay) * 0.11);
  }
  const totals = computeTotals({ ...merged, ...derived });
  const [entry] = await db('payroll').where({ tenant_id: tenantId, id }).update({ ...data, ...derived, ...totals }).returning('*');
  return entry;
}

async function getPayrollSummary(tenantId, month, year) {
  const totalGross = await db('payroll').where({ tenant_id: tenantId, month, year }).sum('basic_pay as total').first();
  const totalNet = await db('payroll').where({ tenant_id: tenantId, month, year }).sum('net_pay as total').first();
  const count = await db('payroll').where({ tenant_id: tenantId, month, year }).count('* as count').first();
  return {
    total_gross: parseFloat(totalGross?.total || 0),
    total_net: parseFloat(totalNet?.total || 0),
    employee_count: parseInt(count?.count || 0, 10),
  };
}

// === TAX BRACKETS ===
async function listTaxBrackets(tenantId) {
  return db('tax_brackets').where({ tenant_id: tenantId, is_active: true }).orderBy('min_salary');
}
async function upsertTaxBracket(tenantId, id, data) {
  if (id) {
    const [b] = await db('tax_brackets').where({ tenant_id: tenantId, id }).update(data).returning('*');
    return b;
  }
  const [b] = await db('tax_brackets').insert({ ...data, tenant_id: tenantId }).returning('*');
  return b;
}
async function removeTaxBracket(tenantId, id) {
  return db('tax_brackets').where({ tenant_id: tenantId, id }).del();
}

// === LEAVES ===
async function listLeaves(tenantId, { staff_id, status } = {}) {
  let q = db('leaves').where({ 'leaves.tenant_id': tenantId })
    .leftJoin('users', 'leaves.staff_id', 'users.id')
    .select('leaves.*', db.raw("concat(users.first_name, ' ', users.last_name) as staff_name"))
    .orderBy('created_at', 'desc');
  if (staff_id) q = q.where('leaves.staff_id', staff_id);
  if (status) q = q.where('leaves.status', status);
  return q;
}
async function createLeave(tenantId, userId, data) {
  const [leave] = await db('leaves').insert({ ...data, tenant_id: tenantId, staff_id: userId }).returning('*');
  return leave;
}
async function approveLeave(tenantId, id, userId) {
  const [leave] = await db('leaves').where({ tenant_id: tenantId, id }).update({ status: 'approved', approved_by: userId }).returning('*');
  return leave;
}
async function rejectLeave(tenantId, id, reason) {
  const [leave] = await db('leaves').where({ tenant_id: tenantId, id }).update({ status: 'rejected', reject_reason: reason }).returning('*');
  return leave;
}

// === PAYROLL AUDIT ===
async function listPayrollAudits(tenantId) {
  return db('payroll_audits').where({ tenant_id: tenantId })
    .leftJoin('users', 'payroll_audits.performed_by', 'users.id')
    .select('payroll_audits.*', db.raw("concat(users.first_name, ' ', users.last_name) as performed_by_name"))
    .orderBy('created_at', 'desc');
}
async function createPayrollAudit(tenantId, data) {
  const [audit] = await db('payroll_audits').insert({ ...data, tenant_id: tenantId }).returning('*');
  return audit;
}

module.exports = {
  createSalaryGrade, findAllSalaryGrades, updateSalaryGrade, removeSalaryGrade,
  createPayroll, findAllPayroll, updatePayroll, getPayrollSummary, calculatePayroll,
  listTaxBrackets, upsertTaxBracket, removeTaxBracket,
  listLeaves, createLeave, approveLeave, rejectLeave,
  listPayrollAudits, createPayrollAudit,
};
