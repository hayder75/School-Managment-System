const { Router } = require('express');
const controller = require('./announcements.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createAnnouncementSchema, updateAnnouncementSchema } = require('./announcements.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/my', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['announcements.view']), controller.listForUser);
router.get('/', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['announcements.view']), controller.list);
router.get('/:id', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['announcements.view']), controller.getById);
router.post('/', requireAccess(['admin', 'owner'], ['announcements.manage']), validate(createAnnouncementSchema), controller.create);
router.put('/:id', requireAccess(['admin', 'owner'], ['announcements.manage']), validate(updateAnnouncementSchema), controller.update);
router.delete('/:id', requireAccess(['admin', 'owner'], ['announcements.manage']), controller.remove);

module.exports = router;
