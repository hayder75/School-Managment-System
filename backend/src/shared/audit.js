const db = require('../config/database');
const logger = require('../config/logger');

/**
 * Write an audit log entry. Never throws — auditing must not break a request.
 *
 * @param {object} req      express request (uses req.user / req.tenant / req.ip)
 * @param {string} action   e.g. 'create' | 'update' | 'delete' | 'approve'
 * @param {string} entity   e.g. 'exam' | 'grade' | 'assessment_type'
 * @param {string} entityId
 * @param {object} [oldValues]
 * @param {object} [newValues]
 */
async function record(req, action, entity, entityId, oldValues = null, newValues = null) {
  try {
    const tenantId = req?.tenant?.id || newValues?.tenant_id || oldValues?.tenant_id || null;
    const userId = req?.user?.userId || null;
    let ip = null;
    let agent = null;
    try {
      ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || null;
      agent = req?.headers?.['user-agent'] || null;
    } catch (e) {
      // ignore header access issues
    }

    await db('audit_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      action,
      entity_type: entity,
      entity_id: entityId || null,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      ip_address: ip,
      user_agent: agent ? String(agent).slice(0, 500) : null,
    });
  } catch (err) {
    logger.error('audit record failed', { error: err.message, action, entity });
  }
}

module.exports = { record };
