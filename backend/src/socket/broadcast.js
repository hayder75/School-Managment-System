const notificationService = require('../modules/notifications/notifications.service');
const logger = require('../config/logger');

let io = null;

function setIo(server) {
  io = server;
}

function getIo() {
  return io;
}

async function notifyUser(tenantId, userId, payload) {
  if (!userId) return null;
  const notification = await notificationService.create(
    tenantId,
    userId,
    payload.title,
    payload.message,
    payload.type || 'info',
    payload.refType || null,
    payload.refId || null
  );
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      reference_id: notification.reference_id,
      created_at: notification.created_at,
    });
  }
  return notification;
}

async function notifyUsers(tenantId, userIds, payload) {
  const unique = [...new Set((userIds || []).filter(Boolean))];
  if (unique.length === 0) return 0;
  try {
    await Promise.all(unique.map((userId) => notifyUser(tenantId, userId, payload)));
  } catch (err) {
    logger.error('Notification fan-out error', { error: err.message });
  }
  return unique.length;
}

module.exports = { setIo, getIo, notifyUser, notifyUsers };
