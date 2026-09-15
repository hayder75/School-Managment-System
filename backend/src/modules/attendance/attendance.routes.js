const { Router } = require('express');
const controller = require('./attendance.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { markAttendanceSchema } = require('./attendance.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/admin/overview', requireAccess(['admin', 'owner'], ['attendance.manage']), controller.getAdminOverview);
router.get('/teacher/overview', requireAccess(['teacher', 'admin', 'owner'], ['attendance.manage']), controller.getTeacherOverview);
router.get('/admin/classes/:classId', requireAccess(['admin', 'owner'], ['attendance.manage']), controller.getAdminClassOverview);
router.post('/classes/:classId', requireAccess(['teacher', 'admin', 'owner'], ['attendance.manage']), validate(markAttendanceSchema), controller.mark);
router.get('/classes/:classId', requireAccess(['teacher', 'admin', 'owner', 'parent'], ['attendance.manage']), controller.getByClassAndDate);
router.get('/classes/:classId/summary', requireAccess(['admin', 'owner'], ['attendance.manage']), controller.getSummary);
router.get('/classes/:classId/stats', requireAccess(['teacher', 'admin', 'owner'], ['attendance.manage']), controller.getClassStats);
router.get('/students/:studentId', requireAccess(['teacher', 'admin', 'owner', 'parent'], ['attendance.manage']), controller.getByStudent);

module.exports = router;
