const { Router } = require('express');
const controller = require('./fees.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { createFeeStructureSchema, updateFeeStructureSchema, createPaymentSchema } = require('./fees.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.use(rbac('admin', 'owner', 'finance'));

router.get('/summary', controller.getSummary);
router.post('/structures', validate(createFeeStructureSchema), controller.createFeeStructure);
router.get('/structures', controller.listFeeStructures);
router.get('/structures/:id', controller.getFeeStructureById);
router.put('/structures/:id', validate(updateFeeStructureSchema), controller.updateFeeStructure);
router.delete('/structures/:id', controller.removeFeeStructure);
router.post('/payments', validate(createPaymentSchema), controller.createPayment);
router.get('/payments', controller.listPayments);
router.get('/payments/:id', controller.getPaymentById);
router.delete('/payments/:id', controller.removePayment);

module.exports = router;
