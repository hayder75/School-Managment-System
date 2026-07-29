const { Router } = require('express');
const controller = require('./grades.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { enterGradesSchema, lockGradesSchema } = require('./grades.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.post('/exams/:examId', rbac('teacher', 'admin', 'owner'), validate(enterGradesSchema), controller.enterGrades);
router.get('/exams/:examId', rbac('teacher', 'admin', 'owner', 'parent'), controller.getByExam);
router.put('/exams/:examId/lock', rbac('teacher', 'admin'), validate(lockGradesSchema), controller.lockGrades);
router.get('/students/:studentId', rbac('teacher', 'admin', 'owner', 'parent', 'student'), controller.getByStudent);

module.exports = router;
