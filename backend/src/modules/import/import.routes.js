const { Router } = require('express');
const controller = require('./import.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');

const router = Router();

router.use(auth);
router.use(tenant);
router.use(rbac('admin', 'owner'));

router.post('/', controller.importData);

module.exports = router;
