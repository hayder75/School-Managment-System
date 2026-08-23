const service = require('./discipline.service');

async function list(req, res) {
  res.json({ success: true, data: await service.list(req.tenant.id, req.query) });
}

async function create(req, res) {
  const row = await service.create(req.tenant.id, req.user.userId, req.body);
  res.status(201).json({ success: true, data: row });
}

async function resolve(req, res) {
  const row = await service.resolve(req.tenant.id, req.user.userId, req.params.id, req.body);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Open case not found' } });
  res.json({ success: true, data: row });
}

module.exports = { list, create, resolve };
