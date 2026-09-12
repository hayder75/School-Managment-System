const { Router } = require('express');
const controller = require('./chat.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/contacts', controller.getContacts);
router.get('/unread', controller.getUnread);

router.post('/conversations', controller.createConversation);
router.post('/conversations/direct', controller.getOrCreateDirect);
router.get('/conversations', controller.listConversations);
router.get('/conversations/:conversationId/messages', controller.getMessages);
router.put('/conversations/:conversationId/read', controller.markRead);
router.post('/conversations/:conversationId/report', controller.reportConversation);

// Moderation (owner/admin)
router.get('/reports', controller.requireModerator, controller.listReports);
router.patch('/reports/:reportId/resolve', controller.requireModerator, controller.resolveReport);
router.post('/users/:userId/restrict', controller.requireModerator, controller.restrictUser);
router.get('/restricted', controller.requireModerator, controller.listRestricted);
router.get('/moderation/conversations', controller.requireModerator, controller.listAllConversations);

module.exports = router;
