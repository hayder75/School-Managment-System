const service = require('./executive.service');

async function kpis(req, res) {
  const data = await service.kpis(req.tenant.id);
  res.json({ success: true, data });
}

async function trend(req, res) {
  const data = await service.trend(req.tenant.id, Number(req.query.months) || 6);
  res.json({ success: true, data });
}

async function pendingExpenses(req, res) {
  res.json({ success: true, data: await service.pendingExpenses(req.tenant.id) });
}

async function decideExpense(req, res) {
  const row = await service.decideExpense(req.tenant.id, req.user.userId, req.params.id, req.body);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Pending expense not found' } });
  res.json({ success: true, data: row });
}

async function pendingPayrolls(req, res) {
  res.json({ success: true, data: await service.pendingPayrolls(req.tenant.id) });
}

async function approvePayroll(req, res) {
  const row = await service.approvePayroll(req.tenant.id, req.user.userId, req.params.id, req.body);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Pending payroll run not found' } });
  res.json({ success: true, data: row });
}

module.exports = { kpis, trend, pendingExpenses, decideExpense, pendingPayrolls, approvePayroll };
