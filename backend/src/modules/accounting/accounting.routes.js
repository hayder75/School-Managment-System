const { Router } = require('express');
const ctrl = require('./accounting.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

router.get('/daily-collections', requireAccess(['owner', 'admin', 'accountant', 'general_manager'], ['payments.reconcile', 'payroll.view']), ctrl.dailyCollections);
router.post('/reconcile', requireAccess(['accountant'], ['payments.reconcile']), ctrl.reconcileDay);
router.get('/batches', requireAccess(['owner', 'admin', 'accountant', 'general_manager'], ['payments.reconcile']), ctrl.listBatches);
router.get('/defaulter-aging', requireAccess(['owner', 'admin', 'accountant', 'general_manager'], ['payments.reconcile', 'reports.view']), ctrl.defaulterAging);
router.get('/monthly-close', requireAccess(['owner', 'admin', 'accountant', 'general_manager'], ['payments.reconcile', 'reports.view']), ctrl.monthlyClose);

module.exports = router;
