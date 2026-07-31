const { Router } = require('express');
const controller = require('./users.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { createUserSchema, updateUserSchema } = require('./users.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.post('/', rbac('admin', 'owner', 'hr'), validate(createUserSchema), controller.create);
router.get('/', rbac('admin', 'owner', 'hr', 'finance'), controller.list);
router.get('/:id', rbac('admin', 'owner', 'hr', 'finance'), controller.getById);
router.put('/:id', rbac('admin', 'owner', 'hr'), validate(updateUserSchema), controller.update);
router.delete('/:id', rbac('admin', 'owner', 'hr'), controller.remove);

module.exports = router;
