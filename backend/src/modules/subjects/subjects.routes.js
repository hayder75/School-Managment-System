const { Router } = require('express');
const controller = require('./subjects.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { createSubjectSchema, updateSubjectSchema } = require('./subjects.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.post('/', rbac('admin', 'owner'), validate(createSubjectSchema), controller.create);
router.get('/', rbac('admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance'), controller.list);
router.get('/:id', rbac('admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance'), controller.getById);
router.put('/:id', rbac('admin', 'owner'), validate(updateSubjectSchema), controller.update);
router.delete('/:id', rbac('admin', 'owner'), controller.remove);

module.exports = router;
