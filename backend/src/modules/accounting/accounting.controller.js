const service = require('./accounting.service');

async function dailyCollections(req, res) {
  const data = await service.dailyCollections(req.tenant.id, req.query);
  res.json({ success: true, data });
}

async function reconcileDay(req, res) {
  try {
    if (!req.body.date) {
      return res.status(400).json({ success: false, error: { code: 'DATE_REQUIRED', message: 'A date is required to reconcile' } });
    }
    const batch = await service.reconcileDay(req.tenant.id, req.user.userId, req.body);
    res.status(201).json({ success: true, data: batch });
  } catch (err) {
    if (err.code === 'NOTHING_TO_RECONCILE') {
      return res.status(400).json({ success: false, error: { code: err.code, message: 'No unlocked payments found for this date' } });
    }
    throw err;
  }
}

async function listBatches(req, res) {
  const data = await service.listBatches(req.tenant.id, req.query);
  res.json({ success: true, data });
}

async function defaulterAging(req, res) {
  const data = await service.defaulterAging(req.tenant.id, req.query);
  res.json({ success: true, data });
}

async function monthlyClose(req, res) {
  const data = await service.monthlyClose(req.tenant.id, req.query);
  res.json({ success: true, data });
}

module.exports = { dailyCollections, reconcileDay, listBatches, defaulterAging, monthlyClose };
