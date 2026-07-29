const userService = require('./users.service');

async function create(req, res) {
  const user = await userService.create(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: user });
}

async function list(req, res) {
  const { page, limit, role, status, search } = req.query;
  const result = await userService.findAll(req.tenant.id, { page, limit, role, status, search });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const user = await userService.findById(req.tenant.id, req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }
  res.json({ success: true, data: user });
}

async function update(req, res) {
  const user = await userService.update(req.tenant.id, req.params.id, req.validated.body);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }
  res.json({ success: true, data: user });
}

async function remove(req, res) {
  await userService.remove(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

module.exports = { create, list, getById, update, remove };
