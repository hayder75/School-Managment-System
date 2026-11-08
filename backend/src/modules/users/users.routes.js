const { Router } = require('express');
const controller = require('./users.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { blockReadOnlyWrites } = require('../../middleware/readOnly');
const { createUserSchema, updateUserSchema, compensationSchema, resetUserPasswordSchema } = require('./users.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.post('/', blockReadOnlyWrites, requireAccess(['admin', 'owner', 'hr'], ['users.manage']), validate(createUserSchema), controller.create);
router.get('/', requireAccess(['admin', 'owner', 'hr', 'finance', 'quality_director', 'principal', 'vice_principal'], ['users.manage']), controller.list);
router.get('/:id', requireAccess(['admin', 'owner', 'hr', 'finance', 'quality_director', 'principal', 'vice_principal'], ['users.manage']), controller.getById);
router.put('/:id/compensation', blockReadOnlyWrites, requireAccess(['admin', 'owner', 'finance'], []), validate(compensationSchema), controller.updateCompensation);
router.put('/:id/password', blockReadOnlyWrites, requireAccess(['owner', 'admin'], ['users.manage']), validate(resetUserPasswordSchema), controller.resetPassword);
router.put('/:id', blockReadOnlyWrites, requireAccess(['admin', 'owner', 'hr', 'quality_director', 'principal', 'vice_principal'], ['users.manage']), validate(updateUserSchema), controller.update);
router.delete('/:id', blockReadOnlyWrites, requireAccess(['admin', 'owner', 'hr'], ['users.manage']), controller.remove);

module.exports = router;
