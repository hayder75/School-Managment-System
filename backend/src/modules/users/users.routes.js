const { Router } = require('express');
const controller = require('./users.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createUserSchema, updateUserSchema } = require('./users.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.post('/', requireAccess(['admin', 'owner', 'hr'], ['users.manage']), validate(createUserSchema), controller.create);
router.get('/', requireAccess(['admin', 'owner', 'hr', 'finance'], ['users.manage']), controller.list);
router.get('/:id', requireAccess(['admin', 'owner', 'hr', 'finance'], ['users.manage']), controller.getById);
router.put('/:id', requireAccess(['admin', 'owner', 'hr'], ['users.manage']), validate(updateUserSchema), controller.update);
router.delete('/:id', requireAccess(['admin', 'owner', 'hr'], ['users.manage']), controller.remove);

module.exports = router;
