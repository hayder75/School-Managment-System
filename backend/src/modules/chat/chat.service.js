const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

const NON_STAFF = ['student', 'parent'];
const MODERATOR_ROLES = ['owner', 'admin'];

function isStaffRole(role) {
  return !!role && !NON_STAFF.includes(role);
}

function isModerator(role) {
  return MODERATOR_ROLES.includes(role);
}

// Contact rules: students only reach students; parents reach staff; staff reach
// staff and parents. There is deliberately NO student <-> staff contact.
function canStartChat(fromRole, toRole) {
  if (fromRole === 'student') return toRole === 'student';
  if (fromRole === 'parent') return isStaffRole(toRole);
  if (isStaffRole(fromRole)) return isStaffRole(toRole) || toRole === 'parent';
  return false;
}

function allowedContactFilters(role) {
  if (role === 'student') return ['all', 'students'];
  if (role === 'parent') return ['all', 'staff'];
  return ['all', 'staff', 'parents'];
}

async function isParticipant(tenantId, conversationId, userId) {
  const row = await db('chat_participants')
    .where({ conversation_id: conversationId, user_id: userId })
    .join('chat_conversations', 'chat_participants.conversation_id', 'chat_conversations.id')
    .where('chat_conversations.tenant_id', tenantId)
    .select('chat_participants.id')
    .first();
  return !!row;
}

async function canAccessConversation(tenantId, conversationId, userId, role) {
  if (isModerator(role)) {
    const conv = await db('chat_conversations').where({ id: conversationId, tenant_id: tenantId }).select('id').first();
    return !!conv;
  }
  return isParticipant(tenantId, conversationId, userId);
}

async function isRestricted(tenantId, userId) {
  const row = await db('chat_restrictions')
    .where({ tenant_id: tenantId, user_id: userId, active: true })
    .first();
  return !!row;
}

async function listContacts(tenantId, user, { filter, q } = {}) {
  const role = user.role;
  let query = db('users').where({ tenant_id: tenantId, status: 'active' }).whereNot('id', user.userId);

  if (role === 'student') query = query.where('role', 'student');
  else if (role === 'parent') query = query.whereNotIn('role', NON_STAFF);
  else query = query.whereNot('role', 'student');

  const allowed = allowedContactFilters(role);
  if (filter && filter !== 'all' && allowed.includes(filter)) {
    if (filter === 'staff') query = query.whereNotIn('role', NON_STAFF);
    else if (filter === 'students') query = query.where('role', 'student');
    else if (filter === 'parents') query = query.where('role', 'parent');
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    query = query.where((b) => {
      b.whereILike('first_name', term).orWhereILike('last_name', term).orWhereILike('email', term);
    });
  }

  const rows = await query
    .select('id', 'first_name', 'last_name', 'role', 'email', 'phone')
    .orderBy('first_name')
    .orderBy('last_name')
    .limit(200);
  return { contacts: rows, filters: allowed };
}

async function createConversation(tenantId, createdBy, { subject, participant_ids = [], creatorRole }) {
  const uniqueIds = [...new Set([createdBy, ...participant_ids])];
  const users = await db('users')
    .whereIn('id', uniqueIds)
    .where({ tenant_id: tenantId, status: 'active' })
    .select('id', 'role');
  const byId = new Map(users.map((u) => [u.id, u]));

  const participants = uniqueIds.filter((id) => byId.has(id));
  const invalid = participant_ids.filter((id) => !byId.has(id) || !canStartChat(creatorRole, byId.get(id)?.role));
  if (invalid.length > 0) {
    const err = new Error('CONTACT_NOT_ALLOWED'); err.code = 'CONTACT_NOT_ALLOWED'; throw err;
  }

  const [conv] = await db('chat_conversations')
    .insert({ tenant_id: tenantId, subject: subject || null, created_by: createdBy })
    .returning('*');
  await db('chat_participants').insert(participants.map((userId) => ({ conversation_id: conv.id, user_id: userId })));
  return conv;
}

async function getOrCreateDirect(tenantId, user, otherId) {
  if (!otherId || otherId === user.userId) {
    const err = new Error('INVALID_CONTACT'); err.code = 'INVALID_CONTACT'; throw err;
  }
  const other = await db('users')
    .where({ tenant_id: tenantId, id: otherId, status: 'active' })
    .select('id', 'role')
    .first();
  if (!other) { const err = new Error('USER_NOT_FOUND'); err.code = 'USER_NOT_FOUND'; throw err; }
  if (!canStartChat(user.role, other.role)) {
    const err = new Error('CONTACT_NOT_ALLOWED'); err.code = 'CONTACT_NOT_ALLOWED'; throw err;
  }
  if (await isRestricted(tenantId, user.userId)) {
    const err = new Error('CHAT_RESTRICTED'); err.code = 'CHAT_RESTRICTED'; throw err;
  }

  // Reuse an existing 2-person conversation between the same two users.
  const candidate = await db('chat_conversations as c')
    .join('chat_participants as pa', 'c.id', 'pa.conversation_id')
    .join('chat_participants as pb', 'c.id', 'pb.conversation_id')
    .where('c.tenant_id', tenantId)
    .where('pa.user_id', user.userId)
    .where('pb.user_id', otherId)
    .select('c.id')
    .first();

  if (candidate) {
    const count = await db('chat_participants').where({ conversation_id: candidate.id }).count('* as c').first();
    if (parseInt(count.c, 10) === 2) {
      return db('chat_conversations').where({ id: candidate.id }).first();
    }
  }

  return createConversation(tenantId, user.userId, { subject: null, participant_ids: [otherId], creatorRole: user.role });
}

async function getUserConversations(tenantId, userId) {
  const convs = await db('chat_conversations')
    .join('chat_participants', 'chat_conversations.id', 'chat_participants.conversation_id')
    .where({ 'chat_conversations.tenant_id': tenantId, 'chat_participants.user_id': userId })
    .select('chat_conversations.*', 'chat_participants.last_read_at')
    .orderBy('chat_conversations.last_message_at', 'desc')
    .limit(200);
  if (convs.length === 0) return convs;

  const ids = convs.map((c) => c.id);
  const parts = await db('chat_participants as cp')
    .join('users as u', 'cp.user_id', 'u.id')
    .whereIn('cp.conversation_id', ids)
    .whereNot('cp.user_id', userId)
    .select('cp.conversation_id', 'u.id', 'u.first_name', 'u.last_name', 'u.role');
  const map = {};
  for (const p of parts) (map[p.conversation_id] = map[p.conversation_id] || []).push({ id: p.id, first_name: p.first_name, last_name: p.last_name, role: p.role });

  return convs.map((c) => ({ ...c, participants: map[c.id] || [] }));
}

async function listAllConversations(tenantId, { q } = {}) {
  let query = db('chat_conversations')
    .where({ tenant_id: tenantId })
    .orderBy('last_message_at', 'desc')
    .limit(200);
  if (q && q.trim()) query = query.whereILike('subject', `%${q.trim()}%`);
  const convs = await query;
  if (convs.length === 0) return convs;
  const ids = convs.map((c) => c.id);
  const parts = await db('chat_participants as cp')
    .join('users as u', 'cp.user_id', 'u.id')
    .whereIn('cp.conversation_id', ids)
    .select('cp.conversation_id', 'u.id', 'u.first_name', 'u.last_name', 'u.role');
  const map = {};
  for (const p of parts) (map[p.conversation_id] = map[p.conversation_id] || []).push({ id: p.id, first_name: p.first_name, last_name: p.last_name, role: p.role });
  return convs.map((c) => ({ ...c, participants: map[c.id] || [] }));
}

async function getConversationMessages(tenantId, conversationId, userId, role, { page = 1, limit = 50 } = {}) {
  const allowed = await canAccessConversation(tenantId, conversationId, userId, role);
  if (!allowed) {
    const err = new Error('FORBIDDEN'); err.code = 'FORBIDDEN'; throw err;
  }
  const query = db('chat_messages')
    .where({ 'chat_messages.tenant_id': tenantId, 'chat_messages.conversation_id': conversationId })
    .leftJoin('users', 'chat_messages.sender_id', 'users.id')
    .select('chat_messages.*', 'users.first_name', 'users.last_name', 'users.role as sender_role')
    .orderBy('chat_messages.created_at', 'asc');

  // page-based pagination kept for compatibility
  return paginatedResult(query, page, limit);
}

async function markAsRead(tenantId, conversationId, userId) {
  const participant = await isParticipant(tenantId, conversationId, userId);
  if (!participant) {
    const err = new Error('FORBIDDEN'); err.code = 'FORBIDDEN'; throw err;
  }
  await db('chat_participants')
    .where({ conversation_id: conversationId, user_id: userId })
    .update({ last_read_at: db.fn.now() });
}

async function getUnreadCount(tenantId, userId) {
  const result = await db('chat_participants')
    .where({ 'chat_participants.user_id': userId })
    .join('chat_conversations', 'chat_participants.conversation_id', 'chat_conversations.id')
    .where('chat_conversations.tenant_id', tenantId)
    .whereRaw('chat_participants.last_read_at IS NULL OR chat_participants.last_read_at < chat_conversations.last_message_at')
    .count('* as count')
    .first();
  return parseInt(result?.count || 0, 10);
}

async function touchConversation(trx, conversationId, preview) {
  await trx('chat_conversations').where({ id: conversationId }).update({
    last_message_at: trx.fn.now(),
    last_message_preview: (preview || '').slice(0, 300),
  });
}

// ---- Moderation ----

async function reportConversation(tenantId, userId, conversationId, { reason, message_id } = {}) {
  const ok = await isParticipant(tenantId, conversationId, userId);
  if (!ok) { const err = new Error('FORBIDDEN'); err.code = 'FORBIDDEN'; throw err; }
  const [row] = await db('chat_reports')
    .insert({ tenant_id: tenantId, conversation_id: conversationId, message_id: message_id || null, reported_by: userId, reason: reason || null })
    .returning('*');
  return row;
}

async function listReports(tenantId, { status } = {}) {
  let query = db('chat_reports as r')
    .leftJoin('users as u', 'r.reported_by', 'u.id')
    .leftJoin('chat_conversations as c', 'r.conversation_id', 'c.id')
    .where('r.tenant_id', tenantId)
    .select('r.*', 'u.first_name as reporter_first_name', 'u.last_name as reporter_last_name', 'c.subject', 'c.last_message_preview')
    .orderBy('r.created_at', 'desc')
    .limit(200);
  if (status && status !== 'all') query = query.where('r.status', status);
  return query;
}

async function resolveReport(tenantId, reportId, moderatorId) {
  const [row] = await db('chat_reports')
    .where({ tenant_id: tenantId, id: reportId })
    .update({ status: 'resolved', resolved_by: moderatorId, resolved_at: db.fn.now() })
    .returning('*');
  return row;
}

async function setUserRestriction(tenantId, moderatorId, userId, { active, reason } = {}) {
  const exists = await db('chat_restrictions').where({ tenant_id: tenantId, user_id: userId }).first();
  if (exists) {
    const [row] = await db('chat_restrictions')
      .where({ id: exists.id })
      .update({ active: !!active, reason: reason || exists.reason, restricted_by: moderatorId, lifted_at: active ? null : db.fn.now() })
      .returning('*');
    return row;
  }
  const [row] = await db('chat_restrictions')
    .insert({ tenant_id: tenantId, user_id: userId, restricted_by: moderatorId, reason: reason || null, active: !!active })
    .returning('*');
  return row;
}

async function listRestricted(tenantId) {
  return db('chat_restrictions as r')
    .join('users as u', 'r.user_id', 'u.id')
    .where('r.tenant_id', tenantId)
    .where('r.active', true)
    .select('r.*', 'u.first_name', 'u.last_name', 'u.role')
    .orderBy('r.created_at', 'desc');
}

module.exports = {
  isStaffRole, isModerator, canStartChat, allowedContactFilters,
  isParticipant, canAccessConversation, isRestricted,
  listContacts, createConversation, getOrCreateDirect,
  getUserConversations, listAllConversations, getConversationMessages,
  markAsRead, getUnreadCount, touchConversation,
  reportConversation, listReports, resolveReport, setUserRestriction, listRestricted,
};
