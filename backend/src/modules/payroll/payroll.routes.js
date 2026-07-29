const { Router } = require('express');
const controller = require('./payroll.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { createSalaryGradeSchema, updateSalaryGradeSchema, createPayrollSchema, updatePayrollSchema } = require('./payroll.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.use(rbac('admin', 'owner', 'finance', 'hr'));

router.get('/grades', controller.listSalaryGrades);
router.post('/grades', validate(createSalaryGradeSchema), controller.createSalaryGrade);
router.put('/grades/:id', validate(updateSalaryGradeSchema), controller.updateSalaryGrade);
router.delete('/grades/:id', controller.removeSalaryGrade);
router.get('/summary', controller.getSummary);
router.post('/', validate(createPayrollSchema), controller.createPayroll);
router.get('/', controller.listPayroll);
router.put('/:id', validate(updatePayrollSchema), controller.updatePayroll);

module.exports = router;
