const { Router } = require('express');
const controller = require('./import.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();

router.use(auth);
router.use(tenant);
router.use(requireAccess(['admin', 'owner'], ['import.manage']));

router.post('/', controller.importData);

module.exports = router;
