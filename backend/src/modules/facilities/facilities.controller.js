const service = require('./facilities.service');

async function listMaintenance(req, res) {
  res.json({ success: true, data: await service.listMaintenance(req.tenant.id, req.query) });
}
async function createMaintenance(req, res) {
  const row = await service.createMaintenance(req.tenant.id, req.user.userId, req.body);
  res.status(201).json({ success: true, data: row });
}
async function updateMaintenance(req, res) {
  const row = await service.updateMaintenance(req.tenant.id, req.params.id, req.body);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
  res.json({ success: true, data: row });
}
async function maintenanceSummary(req, res) {
  res.json({ success: true, data: await service.maintenanceSummary(req.tenant.id) });
}

async function listPurchases(req, res) {
  res.json({ success: true, data: await service.listPurchases(req.tenant.id, req.query) });
}
async function createPurchase(req, res) {
  const row = await service.createPurchase(req.tenant.id, req.user.userId, req.body);
  res.status(201).json({ success: true, data: row });
}
async function decidePurchase(req, res) {
  const row = await service.decidePurchase(req.tenant.id, req.user.userId, req.params.id, req.body);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Purchase request not found' } });
  res.json({ success: true, data: row });
}

module.exports = {
  listMaintenance, createMaintenance, updateMaintenance, maintenanceSummary,
  listPurchases, createPurchase, decidePurchase,
};
