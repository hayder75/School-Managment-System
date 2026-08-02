const { Router } = require('express');
const controller = require('./payroll.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createSalaryGradeSchema, updateSalaryGradeSchema, createPayrollSchema, updatePayrollSchema, calculatePayrollSchema, taxBracketSchema, leaveSchema } = require('./payroll.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.use(requireAccess(['admin', 'owner', 'finance', 'hr'], ['payroll.view', 'payroll.manage', 'leave-management.manage', 'tax-settings.manage', 'payroll-audit.view']));

router.get('/grades', controller.listSalaryGrades);
router.post('/grades', validate(createSalaryGradeSchema), controller.createSalaryGrade);
router.put('/grades/:id', validate(updateSalaryGradeSchema), controller.updateSalaryGrade);
router.delete('/grades/:id', controller.removeSalaryGrade);
router.get('/summary', controller.getSummary);

router.get('/tax-brackets', controller.listTaxBrackets);
router.post('/tax-brackets', requireAccess(['admin', 'owner'], ['tax-settings.manage']), validate(taxBracketSchema), controller.upsertTaxBracket);
router.put('/tax-brackets/:id', requireAccess(['admin', 'owner'], ['tax-settings.manage']), validate(taxBracketSchema), controller.upsertTaxBracket);
router.delete('/tax-brackets/:id', requireAccess(['admin', 'owner'], ['tax-settings.manage']), controller.removeTaxBracket);

router.get('/leaves', controller.listLeaves);
router.post('/leaves', requireAccess(['admin', 'owner', 'hr', 'teacher'], ['leave-management.manage']), validate(leaveSchema), controller.createLeave);
router.patch('/leaves/:id/approve', requireAccess(['admin', 'owner', 'hr'], ['leave-management.manage']), controller.approveLeave);
router.patch('/leaves/:id/reject', requireAccess(['admin', 'owner', 'hr'], ['leave-management.manage']), controller.rejectLeave);

router.get('/audits', controller.listAudits);

router.post('/', validate(createPayrollSchema), controller.createPayroll);
router.post('/calculate', validate(calculatePayrollSchema), controller.calculatePayroll);
router.get('/', controller.listPayroll);
router.put('/:id', validate(updatePayrollSchema), controller.updatePayroll);

module.exports = router;
