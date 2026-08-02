const { Router } = require('express');
const controller = require('./subjects.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createSubjectSchema, updateSubjectSchema } = require('./subjects.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.post('/', requireAccess(['admin', 'owner'], ['subjects.manage']), validate(createSubjectSchema), controller.create);
router.get('/', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance'], ['subjects.manage']), controller.list);
router.get('/:id', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance'], ['subjects.manage']), controller.getById);
router.put('/:id', requireAccess(['admin', 'owner'], ['subjects.manage']), validate(updateSubjectSchema), controller.update);
router.delete('/:id', requireAccess(['admin', 'owner'], ['subjects.manage']), controller.remove);

module.exports = router;
