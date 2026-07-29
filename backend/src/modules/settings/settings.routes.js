const { Router } = require('express');
const controller = require('./settings.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');

const router = Router();

router.use(auth);
router.use(tenant);
router.use(rbac('admin', 'owner'));

router.get('/', controller.getAll);
router.put('/', controller.update);
router.delete('/:key', controller.remove);

module.exports = router;
