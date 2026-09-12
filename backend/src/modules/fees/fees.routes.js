const { Router } = require('express');
const controller = require('./fees.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createFeeStructureSchema, updateFeeStructureSchema, createPaymentSchema, updatePaymentSchema, bulkCreatePaymentsSchema, subscriptionSchema, monthlyGenerateSchema, monthlyPaySchema } = require('./fees.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/my', rbac('student', 'parent'), controller.getMyFees);

router.use(requireAccess(['admin', 'owner', 'finance', 'cashier', 'accountant'], ['fees.manage', 'payments.manage', 'payments.reconcile']));

router.get('/reconciliation/batches', requireAccess(['admin', 'owner', 'finance', 'accountant'], ['payments.reconcile']), controller.listReconciliationBatches);
router.post('/reconciliation/batches', requireAccess(['admin', 'owner', 'finance', 'accountant'], ['payments.reconcile']), controller.createReconciliationBatch);
router.get('/defaulters/aging', requireAccess(['admin', 'owner', 'finance', 'accountant'], ['payments.reconcile', 'reports.view']), controller.getDefaultersAging);
router.get('/monthly-close-pack', requireAccess(['admin', 'owner', 'finance', 'accountant', 'general_manager'], ['reports.view', 'payments.reconcile']), controller.getMonthlyClosePack);

// Optional-fee subscriptions (admin + cashier only)
router.get('/student-subscriptions', requireAccess(['admin', 'owner', 'cashier'], []), controller.listStudentSubscriptions);
router.post('/student-subscriptions', requireAccess(['admin', 'owner', 'cashier'], []), validate(subscriptionSchema), controller.setStudentSubscription);

// Monthly billing + collection (admin + cashier)
router.post('/monthly-bills/generate', requireAccess(['admin', 'owner', 'cashier'], ['fees.manage']), validate(monthlyGenerateSchema), controller.generateMonthlyBills);
router.get('/monthly-collection', requireAccess(['admin', 'owner', 'cashier'], ['fees.manage']), controller.listMonthlyCollection);
router.post('/monthly-collection/pay', requireAccess(['admin', 'owner', 'cashier'], ['fees.manage']), validate(monthlyPaySchema), controller.markMonthsPaid);
router.get('/monthly-bills/student/:studentId', requireAccess(['admin', 'owner', 'cashier'], ['fees.manage']), controller.listStudentBills);

router.get('/summary', controller.getSummary);
router.get('/collection-report', controller.getCollectionReport);
router.get('/payment-trends', controller.getPaymentTrends);
router.get('/ledger/:studentId', controller.getStudentLedger);
router.post('/structures', validate(createFeeStructureSchema), controller.createFeeStructure);
router.get('/structures', controller.listFeeStructures);
router.get('/structures/:id', controller.getFeeStructureById);
router.put('/structures/:id', validate(updateFeeStructureSchema), controller.updateFeeStructure);
router.delete('/structures/:id', controller.removeFeeStructure);
router.post('/payments', validate(createPaymentSchema), controller.createPayment);
router.post('/payments/bulk', validate(bulkCreatePaymentsSchema), controller.createBulkPayments);
router.get('/payments', controller.listPayments);
router.get('/payments/:id', controller.getPaymentById);
router.put('/payments/:id', validate(updatePaymentSchema), controller.updatePayment);
router.delete('/payments/:id', controller.removePayment);

module.exports = router;
