const { Router } = require('express');
const controller = require('./edit-requests.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createRequestSchema, decideSchema } = require('./edit-requests.validation');

const router = Router();

router.use(auth);
router.use(tenant);

const STAFF = ['owner', 'admin', 'teacher', 'principal', 'vice_principal', 'quality_director', 'general_manager', 'super_admin'];

router.post('/', requireAccess(['teacher', 'owner', 'admin'], ['grades.manage']), validate(createRequestSchema), controller.create);
router.get('/', requireAccess(STAFF, ['grades.manage', 'results.review']), controller.list);
router.post('/:id/decide', requireAccess(['owner', 'admin', 'quality_director', 'principal', 'vice_principal', 'general_manager'], ['results.review']), validate(decideSchema), controller.decide);

module.exports = router;
