const { Router } = require('express');
const controller = require('./face-attendance.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

const FACE_ROLES = [
  'face_attendance', 'admin', 'owner', 'hr', 'principal', 'vice_principal', 'quality_director',
];
const guard = requireAccess(FACE_ROLES, ['staff-attendance.manage']);

router.get('/staff', guard, controller.listStaff);
router.post('/staff/:userId/enroll', guard, controller.enroll);
router.delete('/staff/:userId', guard, controller.remove);
router.post('/scan', guard, controller.scan);
router.post('/exception', guard, controller.exception);
router.get('/today', guard, controller.today);
router.get('/settings', guard, controller.getSettings);
router.put('/settings', guard, controller.updateSettings);

module.exports = router;