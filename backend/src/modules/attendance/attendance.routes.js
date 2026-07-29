const { Router } = require('express');
const controller = require('./attendance.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { markAttendanceSchema } = require('./attendance.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.post('/classes/:classId', rbac('teacher', 'admin', 'owner'), validate(markAttendanceSchema), controller.mark);
router.get('/classes/:classId', rbac('teacher', 'admin', 'owner', 'parent'), controller.getByClassAndDate);
router.get('/classes/:classId/summary', rbac('admin', 'owner'), controller.getSummary);
router.get('/students/:studentId', rbac('teacher', 'admin', 'owner', 'parent'), controller.getByStudent);

module.exports = router;
