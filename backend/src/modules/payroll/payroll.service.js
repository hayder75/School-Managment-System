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

module.exports = {
  createSalaryGrade, findAllSalaryGrades, updateSalaryGrade, removeSalaryGrade,
  createPayroll, findAllPayroll, updatePayroll, getPayrollSummary,
};
