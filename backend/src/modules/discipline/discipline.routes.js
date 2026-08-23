const { Router } = require('express');
const ctrl = require('./discipline.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

router.get('/', requireAccess(['owner', 'admin', 'general_manager', 'principal', 'vice_principal'], ['discipline.manage']), ctrl.list);
router.post('/', requireAccess(['owner', 'admin', 'principal', 'vice_principal'], ['discipline.manage']), ctrl.create);
router.post('/:id/resolve', requireAccess(['owner', 'admin', 'principal', 'vice_principal'], ['discipline.manage']), ctrl.resolve);

module.exports = router;
