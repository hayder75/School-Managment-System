const service = require('./assessment-types.service');
const audit = require('../../shared/audit');

async function list(req, res) {
  const data = await service.list(req.tenant.id, {
    includeInactive: req.query.include_inactive === 'true',
  });
  res.json({ success: true, data });
}

async function create(req, res) {
  try {
    const row = await service.create(req.tenant.id, req.validated.body, req.user.userId);
    await audit.record(req, 'create', 'assessment_type', row.id, null, row);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    if (err.code === 'TYPE_EXISTS') {
      return res.status(409).json({ success: false, error: { code: 'TYPE_EXISTS', message: 'An assessment type with this name already exists' } });
    }
    if (err.code === 'NAME_REQUIRED') {
      return res.status(400).json({ success: false, error: { code: 'NAME_REQUIRED', message: 'Name is required' } });
    }
    throw err;
  }
}

async function update(req, res) {
  const before = await service.findById(req.tenant.id, req.params.id);
  if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment type not found' } });
  const row = await service.update(req.tenant.id, req.params.id, req.validated.body);
  await audit.record(req, 'update', 'assessment_type', row.id, before, row);
  res.json({ success: true, data: row });
}

async function remove(req, res) {
  const before = await service.findById(req.tenant.id, req.params.id);
  if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assessment type not found' } });
  const result = await service.remove(req.tenant.id, req.params.id);
  await audit.record(req, result.removed ? 'delete' : 'deactivate', 'assessment_type', before.id, before, result);
  res.json({ success: true, data: result });
}

module.exports = { list, create, update, remove };
