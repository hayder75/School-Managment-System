const { Router } = require('express');
const controller = require('./students.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { createStudentSchema, updateStudentSchema } = require('./students.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/enrollment-stats', rbac('admin', 'owner'), controller.enrollmentStats);
router.get('/class/:classId', rbac('admin', 'owner', 'teacher'), controller.listByClass);
router.post('/promote', rbac('admin', 'owner'), controller.promote);

router.get('/', rbac('admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance'), controller.list);
router.get('/:id', rbac('admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance'), controller.getById);
router.post('/', rbac('admin', 'owner'), validate(createStudentSchema), controller.create);
router.put('/:id', rbac('admin', 'owner'), validate(updateStudentSchema), controller.update);
router.delete('/:id', rbac('admin', 'owner'), controller.remove);

module.exports = router;
