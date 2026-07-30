const { Router } = require('express');
const controller = require('./payroll.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { createSalaryGradeSchema, updateSalaryGradeSchema, createPayrollSchema, updatePayrollSchema, taxBracketSchema, leaveSchema } = require('./payroll.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.use(rbac('admin', 'owner', 'finance', 'hr'));

router.get('/grades', controller.listSalaryGrades);
router.post('/grades', validate(createSalaryGradeSchema), controller.createSalaryGrade);
router.put('/grades/:id', validate(updateSalaryGradeSchema), controller.updateSalaryGrade);
router.delete('/grades/:id', controller.removeSalaryGrade);
router.get('/summary', controller.getSummary);

router.get('/tax-brackets', controller.listTaxBrackets);
router.post('/tax-brackets', rbac('admin', 'owner'), validate(taxBracketSchema), controller.upsertTaxBracket);
router.put('/tax-brackets/:id', rbac('admin', 'owner'), validate(taxBracketSchema), controller.upsertTaxBracket);
router.delete('/tax-brackets/:id', rbac('admin', 'owner'), controller.removeTaxBracket);

router.get('/leaves', controller.listLeaves);
router.post('/leaves', rbac('admin', 'owner', 'hr', 'teacher'), validate(leaveSchema), controller.createLeave);
router.patch('/leaves/:id/approve', rbac('admin', 'owner', 'hr'), controller.approveLeave);
router.patch('/leaves/:id/reject', rbac('admin', 'owner', 'hr'), controller.rejectLeave);

router.get('/audits', controller.listAudits);

router.post('/', validate(createPayrollSchema), controller.createPayroll);
router.get('/', controller.listPayroll);
router.put('/:id', validate(updatePayrollSchema), controller.updatePayroll);

module.exports = router;
