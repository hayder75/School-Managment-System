const service = require('./security.service');

async function listVisitors(req, res) {
  res.json({ success: true, data: await service.listVisitors(req.tenant.id, req.query) });
}
async function createVisitor(req, res) {
  const row = await service.createVisitor(req.tenant.id, req.user.userId, req.body);
  res.status(201).json({ success: true, data: row });
}
async function checkoutVisitor(req, res) {
  const row = await service.checkoutVisitor(req.tenant.id, req.params.id);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Visitor not found or already checked out' } });
  res.json({ success: true, data: row });
}

async function listGatePasses(req, res) {
  res.json({ success: true, data: await service.listGatePasses(req.tenant.id, req.query) });
}
async function createGatePass(req, res) {
  const row = await service.createGatePass(req.tenant.id, req.user.userId, req.body);
  res.status(201).json({ success: true, data: row });
}
async function verifyGatePass(req, res) {
  const row = await service.verifyGatePass(req.tenant.id, req.user.userId, req.body.pass_code || '');
  if (!row) return res.status(404).json({ success: false, error: { code: 'INVALID_PASS', message: 'No valid issued pass found for this code' } });
  res.json({ success: true, data: row });
}
async function cancelGatePass(req, res) {
  const row = await service.cancelGatePass(req.tenant.id, req.params.id);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Issued pass not found' } });
  res.json({ success: true, data: row });
}

async function listIncidents(req, res) {
  res.json({ success: true, data: await service.listIncidents(req.tenant.id, req.query) });
}
async function createIncident(req, res) {
  const row = await service.createIncident(req.tenant.id, req.user.userId, req.body);
  res.status(201).json({ success: true, data: row });
}
async function updateIncident(req, res) {
  const row = await service.updateIncident(req.tenant.id, req.params.id, req.body);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Incident not found' } });
  res.json({ success: true, data: row });
}

module.exports = {
  listVisitors, createVisitor, checkoutVisitor,
  listGatePasses, createGatePass, verifyGatePass, cancelGatePass,
  listIncidents, createIncident, updateIncident,
};
