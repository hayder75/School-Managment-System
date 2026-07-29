const payrollService = require('./payroll.service');

async function createSalaryGrade(req, res) {
  const grade = await payrollService.createSalaryGrade(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: grade });
}

async function listSalaryGrades(req, res) {
  const grades = await payrollService.findAllSalaryGrades(req.tenant.id);
  res.json({ success: true, data: grades });
}

async function updateSalaryGrade(req, res) {
  const grade = await payrollService.updateSalaryGrade(req.tenant.id, req.params.id, req.validated.body);
  if (!grade) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Salary grade not found' } });
  res.json({ success: true, data: grade });
}

async function removeSalaryGrade(req, res) {
  await payrollService.removeSalaryGrade(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

async function createPayroll(req, res) {
  const entry = await payrollService.createPayroll(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: entry });
}

async function listPayroll(req, res) {
  const { page, limit, month, year, status } = req.query;
  const result = await payrollService.findAllPayroll(req.tenant.id, { page, limit, month, year, status });
  res.json({ success: true, ...result });
}

async function updatePayroll(req, res) {
  const entry = await payrollService.updatePayroll(req.tenant.id, req.params.id, req.validated.body);
  if (!entry) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payroll entry not found' } });
  res.json({ success: true, data: entry });
}

async function getSummary(req, res) {
  const { month, year } = req.query;
  const summary = await payrollService.getPayrollSummary(req.tenant.id, month, year);
  res.json({ success: true, data: summary });
}

module.exports = {
  createSalaryGrade, listSalaryGrades, updateSalaryGrade, removeSalaryGrade,
  createPayroll, listPayroll, updatePayroll, getSummary,
};
