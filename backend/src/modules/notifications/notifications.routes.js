const { Router } = require('express');
const controller = require('./notifications.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/', controller.list);
router.get('/unread', controller.getUnread);
router.put('/:id/read', controller.markRead);
router.put('/read-all', controller.markAllRead);

module.exports = router;
