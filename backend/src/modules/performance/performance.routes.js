const { Router } = require('express');
const ctrl = require('./performance.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createCriteriaSchema, updateCriteriaSchema } = require('./performance.validation');

const router = Router();
router.use(auth);
router.use(tenant);

const VIEW = ['admin', 'owner', 'quality_director', 'principal', 'vice_principal', 'hr'];
const EDIT = ['admin', 'owner', 'quality_director', 'principal', 'vice_principal'];

router.get('/criteria', requireAccess(VIEW, ['reports.view', 'quality.review']), ctrl.listCriteria);
router.post('/criteria', requireAccess(EDIT, ['quality.review']), validate(createCriteriaSchema), ctrl.createCriteria);
router.put('/criteria/:id', requireAccess(EDIT, ['quality.review']), validate(updateCriteriaSchema), ctrl.updateCriteria);
router.delete('/criteria/:id', requireAccess(['admin', 'owner'], []), ctrl.removeCriteria);
router.get('/scores', requireAccess(VIEW, ['reports.view', 'quality.review']), ctrl.listScores);

module.exports = router;
