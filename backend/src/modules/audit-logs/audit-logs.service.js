const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, userId, action, entityType, entityId, oldValues, newValues, ipAddress, userAgent) {
  await db('audit_logs').insert({
    tenant_id: tenantId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_values: oldValues ? JSON.stringify(oldValues) : null,
    new_values: newValues ? JSON.stringify(newValues) : null,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
}

async function findAll(tenantId, { page = 1, limit = 20, action, entity_type, user_id, from_date, to_date } = {}) {
  let query = db('audit_logs')
    .leftJoin('users', 'audit_logs.user_id', 'users.id')
    .select('audit_logs.*', 'users.first_name', 'users.last_name', 'users.email')
    .orderBy('audit_logs.created_at', 'desc');

  if (tenantId) {
    query = query.where({ 'audit_logs.tenant_id': tenantId });
  }

  if (action) query = query.where('audit_logs.action', action);
  if (entity_type) query = query.where('audit_logs.entity_type', entity_type);
  if (user_id) query = query.where('audit_logs.user_id', user_id);
  if (from_date) query = query.where('audit_logs.created_at', '>=', from_date);
  if (to_date) query = query.where('audit_logs.created_at', '<=', to_date);

  return paginatedResult(query, page, limit);
}

module.exports = { create, findAll };
