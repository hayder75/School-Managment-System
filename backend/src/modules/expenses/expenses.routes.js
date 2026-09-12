const { Router } = require('express');
const controller = require('./expenses.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createExpenseSchema, updateExpenseSchema } = require('./expenses.validation');

const router = Router();

router.use(auth);
router.use(tenant);
// Executives can view expenses (and GM approves); writes are guarded below.
router.use(requireAccess(['admin', 'owner', 'finance', 'general_manager', 'principal', 'vice_principal', 'quality_director'], ['expenses.manage']));

const EXPENSE_WRITE = requireAccess(['admin', 'owner', 'finance'], []);

router.get('/totals', controller.getTotals);
router.patch('/:id/gm-approve', requireAccess(['admin', 'owner', 'general_manager'], ['expenses.approve']), controller.approveGM);
router.post('/', EXPENSE_WRITE, validate(createExpenseSchema), controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.put('/:id', EXPENSE_WRITE, validate(updateExpenseSchema), controller.update);
router.delete('/:id', EXPENSE_WRITE, controller.remove);

module.exports = router;
