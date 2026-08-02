const { Router } = require('express');
const controller = require('./parents.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { linkParentSchema, updateLinkSchema } = require('./parents.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/my-children', rbac('parent'), controller.myChildren);

router.get('/', requireAccess(['admin', 'owner'], ['parents.manage']), controller.list);
router.get('/:id', requireAccess(['admin', 'owner', 'teacher'], ['parents.manage']), controller.getById);
router.post('/link', requireAccess(['admin', 'owner'], ['parents.manage']), validate(linkParentSchema), controller.link);
router.put('/link/:id', requireAccess(['admin', 'owner'], ['parents.manage']), validate(updateLinkSchema), controller.updateLink);
router.delete('/link/:id', requireAccess(['admin', 'owner'], ['parents.manage']), controller.unlink);

module.exports = router;
