const { Router } = require('express');
const controller = require('./parents.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { linkParentSchema, updateLinkSchema } = require('./parents.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/my-children', rbac('parent'), controller.myChildren);

router.get('/', rbac('admin', 'owner'), controller.list);
router.get('/:id', rbac('admin', 'owner', 'teacher'), controller.getById);
router.post('/link', rbac('admin', 'owner'), validate(linkParentSchema), controller.link);
router.put('/link/:id', rbac('admin', 'owner'), validate(updateLinkSchema), controller.updateLink);
router.delete('/link/:id', rbac('admin', 'owner'), controller.unlink);

module.exports = router;
