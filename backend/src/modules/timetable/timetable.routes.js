const { Router } = require('express');
const controller = require('./timetable.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { createEntrySchema, updateEntrySchema } = require('./timetable.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.post('/', rbac('admin', 'owner'), validate(createEntrySchema), controller.create);
router.get('/classes/:classId', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.getByClass);
router.get('/teachers/:teacherId', rbac('admin', 'owner', 'teacher'), controller.getByTeacher);
router.put('/:id', rbac('admin', 'owner'), validate(updateEntrySchema), controller.update);
router.delete('/:id', rbac('admin', 'owner'), controller.remove);

module.exports = router;
