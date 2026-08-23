const { Router } = require('express');
const ctrl = require('./academic-content.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

// Teacher: manage own submissions
router.get('/', requireAccess(['owner', 'admin', 'teacher', 'quality_director', 'principal', 'vice_principal'], ['quality.submit', 'quality.review']), ctrl.list);
router.get('/summary', requireAccess(['owner', 'admin', 'quality_director', 'principal', 'vice_principal'], ['quality.review']), ctrl.summary);
router.get('/bank', requireAccess(['owner', 'admin', 'teacher', 'quality_director', 'principal', 'vice_principal'], ['quality.submit', 'quality.review']), (req, res) => {
  req.query.bank = '1';
  return ctrl.list(req, res);
});
router.get('/:id', requireAccess(['owner', 'admin', 'teacher', 'quality_director', 'principal', 'vice_principal'], ['quality.submit', 'quality.review']), ctrl.getById);

router.post('/', requireAccess(['teacher'], ['quality.submit']), ctrl.create);
router.put('/:id', requireAccess(['teacher'], ['quality.submit']), ctrl.updateOwn);
router.delete('/:id', requireAccess(['teacher'], ['quality.submit']), ctrl.removeOwn);

// Reviewer actions
router.post('/:id/review', requireAccess(['owner', 'admin', 'quality_director', 'principal', 'vice_principal'], ['quality.review']), ctrl.review);
router.post('/:id/comments', requireAccess(['owner', 'admin', 'teacher', 'quality_director', 'principal', 'vice_principal'], ['quality.submit', 'quality.review']), ctrl.addComment);
router.post('/:id/bank', requireAccess(['owner', 'admin', 'quality_director', 'principal', 'vice_principal'], ['quality.review']), ctrl.toggleBank);

module.exports = router;
