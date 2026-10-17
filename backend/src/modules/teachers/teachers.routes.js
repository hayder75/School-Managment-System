const { Router } = require('express');
const controller = require('./teachers.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { assignSubjectSchema, bulkAssignSchema } = require('./teachers.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.get('/', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance', 'cashier', 'quality_director', 'principal', 'vice_principal', 'general_manager', 'shift_coordinator', 'accountant', 'general_services', 'security_head'], ['teachers.manage']), controller.list);
router.post('/:teacherId/assignments/bulk', requireAccess(['admin', 'owner', 'hr', 'quality_director', 'principal', 'vice_principal'], ['teachers.manage']), validate(bulkAssignSchema), controller.assignBulk);
router.post('/:teacherId/assignments', requireAccess(['admin', 'owner', 'hr', 'quality_director', 'principal', 'vice_principal'], ['teachers.manage']), validate(assignSubjectSchema), controller.assignSubject);
router.get('/:teacherId/assignments', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance', 'cashier', 'quality_director', 'principal', 'vice_principal', 'general_manager', 'shift_coordinator', 'accountant', 'general_services', 'security_head'], ['teachers.manage']), controller.getAssignments);
router.delete('/:teacherId/assignments/:assignmentId', requireAccess(['admin', 'owner', 'hr', 'quality_director', 'principal', 'vice_principal'], ['teachers.manage']), controller.removeAssignment);

module.exports = router;
