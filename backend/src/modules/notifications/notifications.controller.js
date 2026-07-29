const notificationService = require('./notifications.service');

async function list(req, res) {
  const { page, limit, unread } = req.query;
  const tid = req.tenant?.id || null;
  const result = await notificationService.findAll(tid, req.user.userId, { page, limit, unread });
  res.json({ success: true, ...result });
}

async function markRead(req, res) {
  const tid = req.tenant?.id || null;
  const notification = await notificationService.markAsRead(tid, req.user.userId, req.params.id);
  if (!notification) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } });
  }
  res.json({ success: true, data: notification });
}

async function markAllRead(req, res) {
  const tid = req.tenant?.id || null;
  await notificationService.markAllAsRead(tid, req.user.userId);
  res.json({ success: true, data: null });
}

async function getUnread(req, res) {
  const tid = req.tenant?.id || null;
  const count = await notificationService.getUnreadCount(tid, req.user.userId);
  res.json({ success: true, data: { count } });
}

module.exports = { list, markRead, markAllRead, getUnread };
