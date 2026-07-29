const { Router } = require('express');
const controller = require('./exams.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { createExamSchema, updateExamSchema } = require('./exams.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.post('/', rbac('admin', 'owner', 'teacher'), validate(createExamSchema), controller.create);
router.get('/', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.list);
router.get('/:id', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.getById);
router.put('/:id', rbac('admin', 'owner', 'teacher'), validate(updateExamSchema), controller.update);
router.delete('/:id', rbac('admin', 'owner'), controller.remove);

module.exports = router;
