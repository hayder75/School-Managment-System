const { Router } = require('express');
const ctrl = require('./facilities.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

// Maintenance — everyone can report, general services manages
router.get('/maintenance', requireAccess(['owner', 'admin', 'general_services', 'teacher', 'principal', 'vice_principal'], ['services.manage']), ctrl.listMaintenance);
router.get('/maintenance/summary', requireAccess(['owner', 'admin', 'general_services'], ['services.manage']), ctrl.maintenanceSummary);
router.post('/maintenance', requireAccess(['owner', 'admin', 'general_services', 'teacher'], ['services.manage']), ctrl.createMaintenance);
router.put('/maintenance/:id', requireAccess(['owner', 'admin', 'general_services'], ['services.manage']), ctrl.updateMaintenance);

// Purchase requests — general services requests, admin/GM approves
router.get('/purchases', requireAccess(['owner', 'admin', 'general_manager', 'general_services'], ['services.manage', 'expenses.approve']), ctrl.listPurchases);
router.post('/purchases', requireAccess(['general_services'], ['services.manage']), ctrl.createPurchase);
router.post('/purchases/:id/decide', requireAccess(['owner', 'admin', 'general_manager'], ['expenses.approve', 'services.manage']), ctrl.decidePurchase);

module.exports = router;
