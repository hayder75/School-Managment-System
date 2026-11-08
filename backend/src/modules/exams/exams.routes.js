const { Router } = require('express');
const controller = require('./exams.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { blockReadOnlyWrites } = require('../../middleware/readOnly');
const { createExamSchema, updateExamSchema } = require('./exams.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.post('/', blockReadOnlyWrites, requireAccess(['admin', 'owner', 'teacher'], ['exams.manage']), validate(createExamSchema), controller.create);
router.get('/', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent', 'Unit Leader'], ['exams.manage']), controller.list);
router.get('/:id', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent', 'Unit Leader'], ['exams.manage']), controller.getById);
router.put('/:id', blockReadOnlyWrites, requireAccess(['admin', 'owner', 'teacher'], ['exams.manage']), validate(updateExamSchema), controller.update);

// Destructive actions are owner-only.
router.post('/:id/archive', blockReadOnlyWrites, requireAccess(['owner'], []), controller.archive);
router.post('/:id/restore', blockReadOnlyWrites, requireAccess(['owner'], []), controller.restore);
router.delete('/:id', blockReadOnlyWrites, requireAccess(['owner'], []), controller.remove);

module.exports = router;
