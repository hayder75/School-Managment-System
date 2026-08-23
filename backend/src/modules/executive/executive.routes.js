const { Router } = require('express');
const ctrl = require('./executive.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

router.get('/kpis', requireAccess(['general_manager', 'owner'], ['payroll.approve', 'expenses.approve']), ctrl.kpis);
router.get('/trend', requireAccess(['general_manager', 'owner'], ['payroll.approve', 'expenses.approve']), ctrl.trend);
router.get('/expenses/pending', requireAccess(['general_manager', 'owner'], ['expenses.approve']), ctrl.pendingExpenses);
router.post('/expenses/:id/decide', requireAccess(['general_manager', 'owner'], ['expenses.approve']), ctrl.decideExpense);
router.get('/payrolls/pending', requireAccess(['general_manager', 'owner'], ['payroll.approve']), ctrl.pendingPayrolls);
router.post('/payrolls/:id/decide', requireAccess(['general_manager', 'owner'], ['payroll.approve']), ctrl.approvePayroll);

module.exports = router;
