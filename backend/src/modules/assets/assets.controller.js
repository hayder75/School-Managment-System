const service = require('./assets.service');

async function listAssets(req, res) {
  const tenantId = req.tenant.id;
  const { search, category, status } = req.query;
  const assets = await service.listAssets(tenantId, { search, category, status });
  res.json({ success: true, data: assets });
}

async function getSummary(req, res) {
  const tenantId = req.tenant.id;
  const summary = await service.getAssetSummary(tenantId);
  res.json({ success: true, data: summary });
}

async function createAsset(req, res) {
  const tenantId = req.tenant.id;
  const asset = await service.createAsset(tenantId, req.body);
  res.status(201).json({ success: true, data: asset });
}

async function updateAsset(req, res) {
  const tenantId = req.tenant.id;
  const userId = req.user.userId || req.user.id;
  const { id } = req.params;
  const asset = await service.updateAsset(tenantId, userId, id, req.body);
  if (!asset) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
  res.json({ success: true, data: asset });
}

async function getStaffOptions(req, res) {
  res.json({ success: true, data: await service.getStaffOptions(req.tenant.id) });
}

async function listAssignments(req, res) {
  res.json({ success: true, data: await service.listAssignments(req.tenant.id, req.params.id) });
}

async function disposeAsset(req, res) {
  try {
    const approverId = req.user.userId || req.user.id;
    const asset = await service.disposeAsset(req.tenant.id, approverId, req.params.id, req.body);
    if (!asset) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found or already disposed' } });
    res.json({ success: true, data: asset });
  } catch (err) {
    if (err.code === 'REASON_REQUIRED') {
      return res.status(400).json({ success: false, error: { code: err.code, message: 'A disposal reason is required' } });
    }
    throw err;
  }
}

async function inventoryReport(req, res) {
  res.json({ success: true, data: await service.getInventoryReport(req.tenant.id, req.query.year) });
}

async function deleteAsset(req, res) {
  const tenantId = req.tenant.id;
  const { id } = req.params;
  const result = await service.deleteAsset(tenantId, id);
  res.json(result);
}

module.exports = {
  listAssets,
  getSummary,
  createAsset,
  updateAsset,
  deleteAsset,
  getStaffOptions,
  listAssignments,
  disposeAsset,
  inventoryReport,
};
