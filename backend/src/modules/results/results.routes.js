const { Router } = require('express');
const controller = require('./results.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { submitSchema, reviewSchema, commentSchema } = require('./results.validation');

const router = Router();

router.use(auth);
router.use(tenant);

const STAFF = ['owner', 'admin', 'teacher', 'principal', 'vice_principal', 'quality_director', 'general_manager', 'super_admin'];

router.get('/sections', requireAccess(STAFF, ['grades.manage', 'results.review']), controller.sections);
router.get('/status', requireAccess(STAFF, ['grades.manage']), controller.myStatus);
router.post('/submit', requireAccess(['teacher', 'owner', 'admin'], ['grades.manage']), validate(submitSchema), controller.submit);

router.get('/', requireAccess([...STAFF], ['results.review', 'grades.manage']), controller.list);
router.get('/summary', requireAccess([...STAFF], ['results.review']), controller.summary);
router.get('/:id', requireAccess([...STAFF], ['results.review']), controller.detail);
router.post('/:id/review', requireAccess(['owner', 'admin', 'quality_director', 'principal', 'vice_principal', 'general_manager'], ['results.review']), validate(reviewSchema), controller.review);
router.post('/:id/comment', requireAccess(['owner', 'admin', 'quality_director', 'principal', 'vice_principal', 'general_manager'], ['results.review']), validate(commentSchema), controller.comment);

router.get('/settings/reviewers', requireAccess(['owner', 'admin'], ['settings.manage']), controller.reviewers);
router.put('/settings/reviewers', requireAccess(['owner', 'admin'], ['settings.manage']), controller.saveReviewerRoles);

module.exports = router;
