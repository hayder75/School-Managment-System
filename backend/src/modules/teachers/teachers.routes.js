const { Router } = require('express');
const controller = require('./teachers.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { assignSubjectSchema } = require('./teachers.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.get('/', rbac('admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance'), controller.list);
router.post('/:teacherId/assignments', rbac('admin', 'owner'), validate(assignSubjectSchema), controller.assignSubject);
router.get('/:teacherId/assignments', rbac('admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance'), controller.getAssignments);
router.delete('/:teacherId/assignments/:assignmentId', rbac('admin', 'owner'), controller.removeAssignment);

module.exports = router;
