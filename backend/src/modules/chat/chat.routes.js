const { Router } = require('express');
const controller = require('./chat.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/teachers', controller.getTeachers);
router.post('/conversations', controller.createConversation);
router.get('/conversations', controller.listConversations);
router.get('/conversations/:conversationId/messages', controller.getMessages);
router.put('/conversations/:conversationId/read', controller.markRead);
router.get('/unread', controller.getUnread);

module.exports = router;
