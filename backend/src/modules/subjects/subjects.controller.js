const subjectService = require('./subjects.service');

async function create(req, res) {
  const subject = await subjectService.create(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: subject });
}

async function list(req, res) {
  const { page, limit, is_active } = req.query;
  const result = await subjectService.findAll(req.tenant.id, { page, limit, is_active });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const subject = await subjectService.findById(req.tenant.id, req.params.id);
  if (!subject) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Subject not found' },
    });
  }
  res.json({ success: true, data: subject });
}

async function update(req, res) {
  const subject = await subjectService.update(req.tenant.id, req.params.id, req.validated.body);
  if (!subject) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Subject not found' },
    });
  }
  res.json({ success: true, data: subject });
}

async function remove(req, res) {
  await subjectService.remove(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

module.exports = { create, list, getById, update, remove };
