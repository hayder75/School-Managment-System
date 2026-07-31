const chatService = require('./chat.service');

async function createConversation(req, res) {
  const { subject, participant_ids } = req.body;
  const conv = await chatService.createConversation(
    req.tenant.id, req.user.userId, subject, participant_ids || []
  );
  res.status(201).json({ success: true, data: conv });
}

async function listConversations(req, res) {
  const convs = await chatService.getUserConversations(req.tenant.id, req.user.userId);
  res.json({ success: true, data: convs });
}

async function getMessages(req, res) {
  const { page, limit } = req.query;
  const result = await chatService.getConversationMessages(req.tenant.id, req.params.conversationId, req.user.userId, { page, limit });
  res.json({ success: true, ...result });
}

async function markRead(req, res) {
  await chatService.markAsRead(req.tenant.id, req.params.conversationId, req.user.userId);
  res.json({ success: true, data: null });
}

async function getUnread(req, res) {
  const count = await chatService.getUnreadCount(req.tenant.id, req.user.userId);
  res.json({ success: true, data: { count } });
}

async function getTeachers(req, res) {
  const teachers = await require('../../config/database')('users')
    .where({ tenant_id: req.tenant.id, role: 'teacher', status: 'active' })
    .select('id', 'first_name', 'last_name', 'email')
    .orderBy('last_name');
  res.json({ success: true, data: teachers });
}

module.exports = { createConversation, listConversations, getMessages, markRead, getUnread, getTeachers };
