const { Router } = require('express');
const controller = require('./announcements.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { createAnnouncementSchema, updateAnnouncementSchema } = require('./announcements.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/my', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.listForUser);

router.get('/', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.list);
router.get('/:id', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.getById);
router.post('/', rbac('admin', 'owner'), validate(createAnnouncementSchema), controller.create);
router.put('/:id', rbac('admin', 'owner'), validate(updateAnnouncementSchema), controller.update);
router.delete('/:id', rbac('admin', 'owner'), controller.remove);

module.exports = router;
