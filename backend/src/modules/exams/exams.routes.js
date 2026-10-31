const { Router } = require('express');
const controller = require('./exams.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createExamSchema, updateExamSchema } = require('./exams.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.post('/', requireAccess(['admin', 'owner', 'teacher'], ['exams.manage']), validate(createExamSchema), controller.create);
router.get('/', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['exams.manage']), controller.list);
router.get('/:id', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['exams.manage']), controller.getById);
router.put('/:id', requireAccess(['admin', 'owner', 'teacher'], ['exams.manage']), validate(updateExamSchema), controller.update);

// Destructive actions are owner-only.
router.post('/:id/archive', requireAccess(['owner'], []), controller.archive);
router.post('/:id/restore', requireAccess(['owner'], []), controller.restore);
router.delete('/:id', requireAccess(['owner'], []), controller.remove);

module.exports = router;
