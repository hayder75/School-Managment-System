const { Router } = require('express');
const controller = require('./roles.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createRoleSchema, updateRoleSchema, setUserAccessSchema } = require('./roles.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/my', controller.myPermissions);

router.use(requireAccess(['admin', 'owner'], ['roles.manage']));

router.get('/', controller.listRoles);
router.get('/permissions', controller.listPermissions);
router.post('/', validate(createRoleSchema), controller.createRole);
router.put('/:id', validate(updateRoleSchema), controller.updateRole);
router.delete('/:id', controller.deleteRole);
router.get('/users/:userId', controller.getUserAccess);
router.put('/users/:userId', validate(setUserAccessSchema), controller.setUserAccess);

module.exports = router;
