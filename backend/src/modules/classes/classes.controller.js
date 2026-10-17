const classService = require('./classes.service');
const { getUserScopes } = require('../../shared/scope');

async function create(req, res) {
  const cls = await classService.create(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: cls });
}

async function list(req, res) {
  const { page, limit, academic_year_id } = req.query;
  const scopes = await getUserScopes(req.tenant.id, req.user.userId);
  const result = await classService.findAll(req.tenant.id, { page, limit, academic_year_id, scopes });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const cls = await classService.findById(req.tenant.id, req.params.id);
  if (!cls) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Class not found' },
    });
  }
  res.json({ success: true, data: cls });
}

async function update(req, res) {
  const cls = await classService.update(req.tenant.id, req.params.id, req.validated.body);
  if (!cls) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Class not found' },
    });
  }
  res.json({ success: true, data: cls });
}

async function remove(req, res) {
  await classService.remove(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

async function setHomeroom(req, res) {
  const cls = await classService.setHomeroom(req.tenant.id, req.params.id, req.validated.body.class_teacher_id);
  if (!cls) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class not found' } });
  res.json({ success: true, data: cls });
}

module.exports = { create, list, getById, update, remove, setHomeroom };
