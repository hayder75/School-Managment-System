const tenantService = require('./tenants.service');

async function create(req, res) {
  const tenant = await tenantService.create(req.validated.body);
  res.status(201).json({ success: true, data: tenant });
}

async function list(req, res) {
  const { page, limit } = req.query;
  const result = await tenantService.findAll(page, limit);
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const tenant = await tenantService.getTenantDetail(req.params.id);
  if (!tenant) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'School not found' },
    });
  }
  res.json({ success: true, data: tenant });
}

async function update(req, res) {
  const tenant = await tenantService.update(req.params.id, req.validated.body);
  if (!tenant) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'School not found' },
    });
  }
  res.json({ success: true, data: tenant });
}

async function remove(req, res) {
  await tenantService.remove(req.params.id);
  res.json({ success: true, data: null });
}

async function stats(req, res) {
  const data = await tenantService.getSystemStats();
  res.json({ success: true, data });
}

module.exports = { create, list, getById, update, remove, stats };
