const service = require('./kg-schedule.service');

async function get(req, res) {
  const level = req.query.level || 'nursery';
  try {
    res.json({ success: true, data: await service.getSchedule(req.tenant.id, level) });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
  }
}

async function save(req, res) {
  const level = req.query.level || req.body?.level || 'nursery';
  try {
    const data = await service.saveSchedule(req.tenant.id, req.user.userId, level, req.body?.slots);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: { code: err.code || 'ERROR', message: err.message } });
  }
}

module.exports = { get, save };