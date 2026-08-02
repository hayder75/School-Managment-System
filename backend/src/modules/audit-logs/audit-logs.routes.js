const { Router } = require('express');
const controller = require('./audit-logs.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();

router.use(auth);
router.use(tenant);
router.use(requireAccess(['admin', 'owner', 'super_admin'], ['audit.view']));

router.get('/', controller.list);

module.exports = router;
