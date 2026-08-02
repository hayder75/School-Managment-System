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
  const { page, limit, month, year, status, user_id } = req.query;
  const result = await payrollService.findAllPayroll(req.tenant.id, { page, limit, month, year, status, user_id });
  res.json({ success: true, ...result });
}

async function updatePayroll(req, res) {
  const entry = await payrollService.updatePayroll(req.tenant.id, req.params.id, req.validated.body);
  if (!entry) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payroll entry not found' } });
  res.json({ success: true, data: entry });
}

async function calculatePayroll(req, res) {
  const data = await payrollService.calculatePayroll(req.tenant.id, req.validated.body);
  res.json({ success: true, data });
}

async function getSummary(req, res) {
  const { month, year } = req.query;
  const summary = await payrollService.getPayrollSummary(req.tenant.id, month, year);
  res.json({ success: true, data: summary });
}

// === TAX BRACKETS ===
async function listTaxBrackets(req, res) {
  const data = await payrollService.listTaxBrackets(req.tenant.id);
  res.json({ success: true, data });
}
async function upsertTaxBracket(req, res) {
  const data = await payrollService.upsertTaxBracket(req.tenant.id, req.params.id, req.validated.body);
  res.status(req.params.id ? 200 : 201).json({ success: true, data });
}
async function removeTaxBracket(req, res) {
  await payrollService.removeTaxBracket(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

// === LEAVES ===
async function listLeaves(req, res) {
  const { staff_id, status } = req.query;
  const data = await payrollService.listLeaves(req.tenant.id, { staff_id, status });
  res.json({ success: true, data });
}
async function createLeave(req, res) {
  const data = await payrollService.createLeave(req.tenant.id, req.user.userId, req.validated.body);
  res.status(201).json({ success: true, data });
}
async function approveLeave(req, res) {
  const data = await payrollService.approveLeave(req.tenant.id, req.params.id, req.user.userId);
  if (!data) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Leave not found' } });
  res.json({ success: true, data });
}
async function rejectLeave(req, res) {
  const data = await payrollService.rejectLeave(req.tenant.id, req.params.id, req.body.reason);
  if (!data) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Leave not found' } });
  res.json({ success: true, data });
}

// === PAYROLL AUDIT ===
async function listAudits(req, res) {
  const data = await payrollService.listPayrollAudits(req.tenant.id);
  res.json({ success: true, data });
}

module.exports = {
  createSalaryGrade, listSalaryGrades, updateSalaryGrade, removeSalaryGrade,
  createPayroll, listPayroll, updatePayroll, getSummary, calculatePayroll,
  listTaxBrackets, upsertTaxBracket, removeTaxBracket,
  listLeaves, createLeave, approveLeave, rejectLeave,
  listAudits,
};
