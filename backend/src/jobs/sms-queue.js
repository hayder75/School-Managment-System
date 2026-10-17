const db = require('../config/database');
const logger = require('../config/logger');
const sms = require('../modules/sms/sms.service');

// Dispatch queued SMS for every tenant, honouring each tenant's master switch
// and the 999/day cap enforced inside sms.processQueue.
async function processSmsQueues() {
  const tenants = await db('tenants').select('id');
  let sent = 0;
  let failed = 0;
  for (const t of tenants) {
    try {
      const res = await sms.processQueue(t.id);
      if (res && res.sent) sent += res.sent;
      if (res && res.failed) failed += res.failed;
    } catch (err) {
      logger.error('SMS queue job error', { tenantId: t.id, error: err.message });
    }
  }
  return { sent, failed };
}

module.exports = { processSmsQueues };