const { Router } = require('express');
const controller = require('./audit-logs.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');

const router = Router();

router.use(auth);
router.use(tenant);
router.use(rbac('admin', 'owner', 'super_admin'));

router.get('/', controller.list);

module.exports = router;
