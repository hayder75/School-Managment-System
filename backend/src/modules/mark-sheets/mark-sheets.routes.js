const { Router } = require('express');
const controller = require('./mark-sheets.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { blockReadOnlyWrites } = require('../../middleware/readOnly');
const {
  sheetQuerySchema, overviewQuerySchema, saveSchema, reviewSchema, configSchema, templateSchema,
} = require('./mark-sheets.validation');

const router = Router();
router.use(auth);
router.use(tenant);

const STAFF = ['owner', 'admin', 'teacher', 'support', 'principal', 'vice_principal', 'quality_director', 'general_manager', 'Unit Leader'];

router.get('/overview', requireAccess(STAFF, ['grades.manage', 'reports.view']), validate(overviewQuerySchema), controller.overview);
router.get('/templates', requireAccess(STAFF, ['grades.manage', 'settings.manage']), controller.listTemplates);
router.post('/templates', blockReadOnlyWrites, requireAccess(['owner', 'admin'], ['settings.manage']), validate(templateSchema), controller.saveTemplate);
router.put('/templates/:id', blockReadOnlyWrites, requireAccess(['owner', 'admin'], ['settings.manage']), validate(templateSchema), controller.saveTemplate);
router.delete('/templates/:id', blockReadOnlyWrites, requireAccess(['owner', 'admin'], ['settings.manage']), controller.deleteTemplate);

router.get('/', requireAccess(STAFF, ['grades.manage']), validate(sheetQuerySchema), controller.getSheet);
router.put('/:id/config', blockReadOnlyWrites, requireAccess(STAFF, ['grades.manage']), validate(configSchema), controller.updateConfig);
router.post('/:id/save', blockReadOnlyWrites, requireAccess(STAFF, ['grades.manage']), validate(saveSchema), controller.save);
router.post('/:id/submit', blockReadOnlyWrites, requireAccess(STAFF, ['grades.manage', 'results.submit']), controller.submit);
router.post('/:id/review', blockReadOnlyWrites, requireAccess(['owner', 'admin', 'quality_director', 'principal', 'vice_principal', 'general_manager'], ['results.review']), validate(reviewSchema), controller.review);
router.get('/:id/export', requireAccess(STAFF, ['grades.manage', 'reports.view']), controller.exportSheet);

module.exports = router;
