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

async function createPayroll(tenantId, data) {
  const [entry] = await db('payroll').insert({ ...data, tenant_id: tenantId }).returning('*');
  return entry;
}

async function findAllPayroll(tenantId, { page = 1, limit = 20, month, year, status } = {}) {
  let query = db('payroll')
    .where({ 'payroll.tenant_id': tenantId })
    .leftJoin('users', 'payroll.user_id', 'users.id')
    .leftJoin('salary_grades', 'payroll.salary_grade_id', 'salary_grades.id')
    .select('payroll.*', 'users.first_name', 'users.last_name', 'users.email', 'salary_grades.name as grade_name')
    .orderBy('payroll.year', 'desc')
    .orderBy('payroll.month', 'desc');
  if (month) query = query.where('payroll.month', month);
  if (year) query = query.where('payroll.year', year);
  if (status) query = query.where('payroll.status', status);
  return paginatedResult(query, page, limit);
}

async function updatePayroll(tenantId, id, data) {
  const [entry] = await db('payroll').where({ tenant_id: tenantId, id }).update(data).returning('*');
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
  createPayroll, findAllPayroll, updatePayroll, getPayrollSummary,
  listTaxBrackets, upsertTaxBracket, removeTaxBracket,
  listLeaves, createLeave, approveLeave, rejectLeave,
  listPayrollAudits, createPayrollAudit,
};
