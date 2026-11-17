const { Router } = require('express');
const controller = require('./classes.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createClassSchema, updateClassSchema, homeroomSchema, supportStaffSchema } = require('./classes.validation');

const router = Router();

router.use(auth);
router.use(tenant);
router.post('/', requireAccess(['admin', 'owner'], ['classes.manage']), validate(createClassSchema), controller.create);
router.get('/', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance', 'cashier', 'quality_director', 'principal', 'vice_principal', 'general_manager', 'shift_coordinator', 'accountant', 'general_services', 'security_head'], ['classes.manage']), controller.list);
router.get('/:id', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent', 'hr', 'finance', 'cashier', 'quality_director', 'principal', 'vice_principal', 'general_manager', 'shift_coordinator', 'accountant', 'general_services', 'security_head'], ['classes.manage']), controller.getById);
router.put('/:id', requireAccess(['admin', 'owner'], ['classes.manage']), validate(updateClassSchema), controller.update);
router.put('/:id/homeroom', requireAccess(['admin', 'owner', 'hr', 'general_manager', 'principal', 'vice_principal', 'quality_director'], ['classes.manage', 'staff-attendance.manage']), validate(homeroomSchema), controller.setHomeroom);
router.get('/:id/support-staff', requireAccess(['admin', 'owner', 'teacher', 'hr', 'principal', 'vice_principal', 'general_manager', 'quality_director'], ['classes.manage', 'attendance.manage']), controller.listSupportStaff);
router.post('/:id/support-staff', requireAccess(['admin', 'owner', 'hr', 'general_manager'], ['classes.manage']), validate(supportStaffSchema), controller.addSupportStaff);
router.delete('/:id/support-staff/:userId', requireAccess(['admin', 'owner', 'hr', 'general_manager'], ['classes.manage']), controller.removeSupportStaff);
router.delete('/:id', requireAccess(['admin', 'owner'], ['classes.manage']), controller.remove);

module.exports = router;
