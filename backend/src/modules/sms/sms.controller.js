const service = require('./sms.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

async function preview(req, res) {
  ok(res, await service.previewCount(req.tenant.id, req.query.class_id || null));
}

async function create(req, res) {
  const { title, message, class_id, test_mode } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'A message is required' } });
  }
  const campaign = await service.createCampaign(req.tenant.id, req.user.userId, {
    title, message, class_id: class_id || null, test_mode,
  });
  ok(res, campaign, 201);
}

async function listCampaigns(req, res) {
  ok(res, await service.listCampaigns(req.tenant.id, req.query));
}

async function listMessages(req, res) {
  ok(res, await service.listMessages(req.tenant.id, req.params.id, req.query));
}

async function cancel(req, res) {
  const row = await service.cancelCampaign(req.tenant.id, req.params.id);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Campaign not found' } });
  ok(res, row);
}

async function stats(req, res) {
  ok(res, await service.stats(req.tenant.id));
}

async function getConfig(req, res) {
  ok(res, await service.getPublicConfig(req.tenant.id));
}

async function putConfig(req, res) {
  ok(res, await service.setConfig(req.tenant.id, req.body || {}));
}

async function process(req, res) {
  ok(res, await service.processQueue(req.tenant.id, req.body || {}));
}

module.exports = {
  preview, create, listCampaigns, listMessages, cancel, stats, getConfig, putConfig, process,
};