const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function createConversation(tenantId, createdBy, subject, participantIds) {
  const [conv] = await db('chat_conversations')
    .insert({ tenant_id: tenantId, subject, created_by: createdBy })
    .returning('*');

  const participants = [createdBy, ...participantIds].map((userId) => ({
    conversation_id: conv.id,
    user_id: userId,
  }));
  await db('chat_participants').insert(participants);

  return conv;
}

async function getUserConversations(tenantId, userId) {
  return db('chat_conversations')
    .where({ 'chat_conversations.tenant_id': tenantId })
    .join('chat_participants', 'chat_conversations.id', 'chat_participants.conversation_id')
    .where('chat_participants.user_id', userId)
    .leftJoin(
      db('chat_messages')
        .select('conversation_id')
        .max('created_at as last_message_at')
        .groupBy('conversation_id')
        .as('last_msg'),
      'chat_conversations.id',
      'last_msg.conversation_id'
    )
    .select(
      'chat_conversations.*',
      'chat_participants.last_read_at',
      'last_msg.last_message_at'
    )
    .orderBy('last_msg.last_message_at', 'desc');
}

async function getConversationMessages(tenantId, conversationId, { page = 1, limit = 50 } = {}) {
  const query = db('chat_messages')
    .where({ 'chat_messages.tenant_id': tenantId, 'chat_messages.conversation_id': conversationId })
    .leftJoin('users', 'chat_messages.sender_id', 'users.id')
    .select(
      'chat_messages.*',
      'users.first_name',
      'users.last_name'
    )
    .orderBy('chat_messages.created_at', 'asc');

  return paginatedResult(query, page, limit);
}

async function markAsRead(conversationId, userId) {
  await db('chat_participants')
    .where({ conversation_id: conversationId, user_id: userId })
    .update({ last_read_at: db.fn.now() });
}

async function getUnreadCount(tenantId, userId) {
  const result = await db('chat_participants')
    .where({ 'chat_participants.user_id': userId })
    .join('chat_conversations', 'chat_participants.conversation_id', 'chat_conversations.id')
    .where('chat_conversations.tenant_id', tenantId)
    .whereRaw('chat_participants.last_read_at IS NULL OR chat_participants.last_read_at < (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = chat_participants.conversation_id)')
    .count('* as count')
    .first();

  return parseInt(result?.count || 0, 10);
}

module.exports = { createConversation, getUserConversations, getConversationMessages, markAsRead, getUnreadCount };
