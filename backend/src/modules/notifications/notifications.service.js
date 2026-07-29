const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, userId, title, message, type = 'info', refType = null, refId = null) {
  const [notification] = await db('notifications')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      title,
      message,
      type,
      reference_type: refType,
      reference_id: refId,
    })
    .returning('*');
  return notification;
}

async function findAll(tenantId, userId, { page = 1, limit = 20, unread } = {}) {
  let query = db('notifications')
    .where({ tenant_id: tenantId, user_id: userId })
    .orderBy('created_at', 'desc');

  if (unread === 'true') query = query.where({ is_read: false });

  return paginatedResult(query, page, limit);
}

async function markAsRead(tenantId, userId, id) {
  const [notification] = await db('notifications')
    .where({ tenant_id: tenantId, user_id: userId, id })
    .update({ is_read: true })
    .returning('*');
  return notification;
}

async function markAllAsRead(tenantId, userId) {
  await db('notifications')
    .where({ tenant_id: tenantId, user_id: userId, is_read: false })
    .update({ is_read: true });
}

async function getUnreadCount(tenantId, userId) {
  const result = await db('notifications')
    .where({ tenant_id: tenantId, user_id: userId, is_read: false })
    .count('* as count')
    .first();
  return parseInt(result?.count || 0, 10);
}

module.exports = { create, findAll, markAsRead, markAllAsRead, getUnreadCount };
