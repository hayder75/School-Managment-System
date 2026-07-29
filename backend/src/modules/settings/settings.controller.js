const settingsService = require('./settings.service');

async function getAll(req, res) {
  const settings = await settingsService.get(req.tenant.id);
  res.json({ success: true, data: settings });
}

async function update(req, res) {
  await settingsService.setMany(req.tenant.id, req.body);
  const settings = await settingsService.get(req.tenant.id);
  res.json({ success: true, data: settings });
}

async function remove(req, res) {
  await settingsService.remove(req.tenant.id, req.params.key);
  res.json({ success: true, data: null });
}

module.exports = { getAll, update, remove };
