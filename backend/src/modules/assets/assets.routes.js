const { Router } = require('express');
const ctrl = require('./assets.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

router.get('/', requireAccess(['admin', 'owner', 'hr', 'teacher'], ['operations.manage']), ctrl.listAssets);
router.get('/summary', requireAccess(['admin', 'owner', 'hr'], ['operations.manage']), ctrl.getSummary);
router.post('/', requireAccess(['admin', 'owner', 'hr'], ['operations.manage']), ctrl.createAsset);
router.put('/:id', requireAccess(['admin', 'owner', 'general_services', 'hr'], ['operations.manage', 'services.manage']), ctrl.updateAsset);
router.delete('/:id', requireAccess(['admin', 'owner', 'general_services'], ['operations.manage', 'services.manage']), ctrl.deleteAsset);

router.get('/staff-options', requireAccess(['admin', 'owner', 'general_services', 'hr'], ['operations.manage', 'services.manage']), ctrl.getStaffOptions);
router.get('/inventory-report', requireAccess(['admin', 'owner', 'general_services', 'hr'], ['operations.manage', 'services.manage']), ctrl.inventoryReport);
router.get('/:id/assignments', requireAccess(['admin', 'owner', 'general_services', 'hr'], ['operations.manage', 'services.manage']), ctrl.listAssignments);
router.post('/:id/dispose', requireAccess(['admin', 'owner', 'general_services'], ['operations.manage', 'services.manage']), ctrl.disposeAsset);

module.exports = router;
