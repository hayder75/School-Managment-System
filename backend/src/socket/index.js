const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/database');
const logger = require('../config/logger');
const notificationService = require('../modules/notifications/notifications.service');

function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId;
    logger.info(`Socket connected: user ${userId}`);

    socket.join(`user:${userId}`);

    socket.on('join:conversation', (conversationId) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('leave:conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('message:send', async (data, callback) => {
      try {
        const { conversationId, content } = data;
        if (!conversationId || !content) {
          return callback?.({ error: 'conversationId and content required' });
        }

        const [message] = await db('chat_messages')
          .insert({
            tenant_id: socket.user.tenantId,
            conversation_id: conversationId,
            sender_id: userId,
            content,
          })
          .returning('*');

        const sender = await db('users')
          .where({ id: userId })
          .select('first_name', 'last_name')
          .first();

        const messageWithUser = {
          ...message,
          sender_id: userId,
          first_name: sender?.first_name || null,
          last_name: sender?.last_name || null,
        };

        io.to(`conv:${conversationId}`).emit('message:new', messageWithUser);

        const participants = await db('chat_participants')
          .where({ conversation_id: conversationId })
          .whereNot('user_id', userId);

        for (const p of participants) {
          await notificationService.create(
            socket.user.tenantId,
            p.user_id,
            'New Message',
            content.slice(0, 100),
            'chat',
            'conversation',
            conversationId
          );
          io.to(`user:${p.user_id}`).emit('notification:new', {
            title: 'New Message',
            message: content.slice(0, 100),
            type: 'chat',
            reference_id: conversationId,
          });
        }

        callback?.({ success: true, message });
      } catch (err) {
        logger.error('Socket message error', { error: err.message });
        callback?.({ error: err.message });
      }
    });

    socket.on('typing:start', (conversationId) => {
      socket.to(`conv:${conversationId}`).emit('typing', { userId, conversationId });
    });

    socket.on('typing:stop', (conversationId) => {
      socket.to(`conv:${conversationId}`).emit('typing:stopped', { userId, conversationId });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: user ${userId}`);
    });
  });

  return io;
}

module.exports = { setupSocket };
