const { Router } = require('express');
const controller = require('./tenants.controller');
const auth = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { createTenantSchema, updateTenantSchema } = require('./tenants.validation');

const router = Router();

router.use(auth);
router.use(rbac('super_admin'));

router.get('/stats', controller.stats);
router.post('/', validate(createTenantSchema), controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.put('/:id', validate(updateTenantSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
