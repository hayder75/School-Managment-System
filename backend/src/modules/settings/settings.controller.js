const settingsService = require('./settings.service');

async function getAll(req, res) {
  const settings = await settingsService.get(req.tenant.id);
  res.json({ success: true, data: settings });
}

async function getCalendar(req, res) {
  const value = await settingsService.getByKey(req.tenant.id, 'calendar');
  res.json({ success: true, data: value || 'both' });
}

async function getFeeSettings(req, res) {
  const [grace, type, amount] = await Promise.all([
    settingsService.getByKey(req.tenant.id, 'fee_grace_days'),
    settingsService.getByKey(req.tenant.id, 'fee_penalty_type'),
    settingsService.getByKey(req.tenant.id, 'fee_penalty_amount'),
  ]);
  res.json({
    success: true,
    data: {
      grace_days: grace === null || grace === undefined ? 5 : grace,
      penalty_type: type || 'fixed',
      penalty_amount: amount === null || amount === undefined ? 100 : amount,
    },
  });
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

module.exports = { getAll, getCalendar, getFeeSettings, update, remove };
