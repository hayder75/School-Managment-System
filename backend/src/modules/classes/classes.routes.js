const { Router } = require('express');
const controller = require('./classes.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createClassSchema, updateClassSchema } = require('./classes.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.post('/', requireAccess(['admin', 'owner'], ['classes.manage']), validate(createClassSchema), controller.create);
router.get('/', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance'], ['classes.manage']), controller.list);
router.get('/:id', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance'], ['classes.manage']), controller.getById);
router.put('/:id', requireAccess(['admin', 'owner'], ['classes.manage']), validate(updateClassSchema), controller.update);
router.delete('/:id', requireAccess(['admin', 'owner'], ['classes.manage']), controller.remove);

module.exports = router;
