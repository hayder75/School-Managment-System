const expenseService = require('./expenses.service');

async function create(req, res) {
  const expense = await expenseService.create(req.tenant.id, req.user.userId, req.validated.body);
  res.status(201).json({ success: true, data: expense });
}

async function list(req, res) {
  const { page, limit, category, from_date, to_date } = req.query;
  const result = await expenseService.findAll(req.tenant.id, { page, limit, category, from_date, to_date });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const expense = await expenseService.findById(req.tenant.id, req.params.id);
  if (!expense) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Expense not found' } });
  res.json({ success: true, data: expense });
}

async function update(req, res) {
  const expense = await expenseService.update(req.tenant.id, req.params.id, req.validated.body);
  if (!expense) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Expense not found' } });
  res.json({ success: true, data: expense });
}

async function remove(req, res) {
  await expenseService.remove(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

async function getTotals(req, res) {
  const { from_date, to_date } = req.query;
  const totals = await expenseService.getTotalsByCategory(req.tenant.id, { from_date, to_date });
  res.json({ success: true, data: totals });
}

module.exports = { create, list, getById, update, remove, getTotals };
