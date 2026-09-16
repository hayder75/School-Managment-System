const service = require('./performance.service');

async function listCriteria(req, res) {
  res.json({ success: true, data: await service.listCriteria(req.tenant.id) });
}

async function createCriteria(req, res) {
  const row = await service.createCriteria(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: row });
}

async function updateCriteria(req, res) {
  const row = await service.updateCriteria(req.tenant.id, req.params.id, req.validated.body);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Criteria not found' } });
  res.json({ success: true, data: row });
}

async function removeCriteria(req, res) {
  await service.removeCriteria(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

async function listScores(req, res) {
  res.json({ success: true, data: await service.listScores(req.tenant.id, { academic_year: req.query.academic_year }) });
}

module.exports = { listCriteria, createCriteria, updateCriteria, removeCriteria, listScores };
