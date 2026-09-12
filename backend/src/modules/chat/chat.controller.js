const chatService = require('./chat.service');

function sendError(res, err) {
  const map = {
    FORBIDDEN: [403, 'You are not allowed to do that'],
    CONTACT_NOT_ALLOWED: [403, 'You are not allowed to chat with this person'],
    INVALID_CONTACT: [400, 'Invalid contact'],
    USER_NOT_FOUND: [404, 'User not found'],
    CHAT_RESTRICTED: [403, 'Your chat access has been restricted by an administrator'],
  };
  const [status, message] = map[err.code] || [500, 'Chat error'];
  return res.status(status).json({ success: false, error: { code: err.code || 'CHAT_ERROR', message } });
}

async function getContacts(req, res) {
  const data = await chatService.listContacts(req.tenant.id, req.user, {
    filter: req.query.filter,
    q: req.query.q,
  });
  res.json({ success: true, data });
}

async function createConversation(req, res) {
  try {
    const conv = await chatService.createConversation(req.tenant.id, req.user.userId, {
      ...req.body,
      creatorRole: req.user.role,
    });
    res.status(201).json({ success: true, data: conv });
  } catch (err) {
    sendError(res, err);
  }
}

async function getOrCreateDirect(req, res) {
  try {
    const conv = await chatService.getOrCreateDirect(req.tenant.id, req.user, req.body.user_id);
    res.status(200).json({ success: true, data: conv });
  } catch (err) {
    sendError(res, err);
  }
}

async function listConversations(req, res) {
  const convs = await chatService.getUserConversations(req.tenant.id, req.user.userId);
  res.json({ success: true, data: convs });
}

async function getMessages(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await chatService.getConversationMessages(
      req.tenant.id, req.params.conversationId, req.user.userId, req.user.role, { page, limit }
    );
    res.json({ success: true, ...result });
  } catch (err) {
    sendError(res, err);
  }
}

async function markRead(req, res) {
  await chatService.markAsRead(req.tenant.id, req.params.conversationId, req.user.userId);
  res.json({ success: true, data: null });
}

async function getUnread(req, res) {
  const count = await chatService.getUnreadCount(req.tenant.id, req.user.userId);
  res.json({ success: true, data: { count } });
}

async function reportConversation(req, res) {
  try {
    const row = await chatService.reportConversation(req.tenant.id, req.user.userId, req.params.conversationId, req.body);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    sendError(res, err);
  }
}

// ---- Moderation (owner/admin) ----
function requireModerator(req, res, next) {
  if (!chatService.isModerator(req.user.role)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Moderator access required' } });
  }
  next();
}

async function listReports(req, res) {
  const data = await chatService.listReports(req.tenant.id, { status: req.query.status });
  res.json({ success: true, data });
}

async function resolveReport(req, res) {
  const data = await chatService.resolveReport(req.tenant.id, req.params.reportId, req.user.userId);
  res.json({ success: true, data });
}

async function restrictUser(req, res) {
  const data = await chatService.setUserRestriction(req.tenant.id, req.user.userId, req.params.userId, req.body);
  res.json({ success: true, data });
}

async function listRestricted(req, res) {
  const data = await chatService.listRestricted(req.tenant.id);
  res.json({ success: true, data });
}

async function listAllConversations(req, res) {
  const data = await chatService.listAllConversations(req.tenant.id, { q: req.query.q });
  res.json({ success: true, data });
}

module.exports = {
  getContacts, createConversation, getOrCreateDirect, listConversations, getMessages, markRead, getUnread,
  reportConversation, requireModerator, listReports, resolveReport, restrictUser, listRestricted, listAllConversations,
};
