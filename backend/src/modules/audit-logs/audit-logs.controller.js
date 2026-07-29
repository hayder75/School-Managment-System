const auditLogService = require('./audit-logs.service');

async function list(req, res) {
  const { page, limit, action, entity_type, user_id, from_date, to_date } = req.query;
  const tenantId = req.tenant?.id || null;
  const result = await auditLogService.findAll(tenantId, { page, limit, action, entity_type, user_id, from_date, to_date });
  res.json({ success: true, ...result });
}

module.exports = { list };
