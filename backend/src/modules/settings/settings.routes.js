const { Router } = require('express');
const controller = require('./settings.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();

router.use(auth);
router.use(tenant);
router.use(requireAccess(['admin', 'owner'], ['settings.manage']));

router.get('/', controller.getAll);
router.put('/', controller.update);
router.delete('/:key', controller.remove);

module.exports = router;
