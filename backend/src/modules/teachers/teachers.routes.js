const { Router } = require('express');
const controller = require('./teachers.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { assignSubjectSchema } = require('./teachers.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.get('/', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance'], ['teachers.manage']), controller.list);
router.post('/:teacherId/assignments', requireAccess(['admin', 'owner'], ['teachers.manage']), validate(assignSubjectSchema), controller.assignSubject);
router.get('/:teacherId/assignments', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance'], ['teachers.manage']), controller.getAssignments);
router.delete('/:teacherId/assignments/:assignmentId', requireAccess(['admin', 'owner'], ['teachers.manage']), controller.removeAssignment);

module.exports = router;
