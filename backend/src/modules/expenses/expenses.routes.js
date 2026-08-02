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
router.use(requireAccess(['admin', 'owner', 'finance'], ['expenses.manage']));

router.get('/totals', controller.getTotals);
router.post('/', validate(createExpenseSchema), controller.create);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.put('/:id', validate(updateExpenseSchema), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
