const { Router } = require('express');
const controller = require('./grades.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { enterGradesSchema, lockGradesSchema } = require('./grades.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.post('/exams/:examId', requireAccess(['teacher', 'admin', 'owner'], ['grades.manage']), validate(enterGradesSchema), controller.enterGrades);
router.get('/exams/:examId', requireAccess(['teacher', 'admin', 'owner', 'parent'], ['grades.manage']), controller.getByExam);
router.put('/exams/:examId/lock', requireAccess(['teacher', 'admin'], ['grades.manage']), validate(lockGradesSchema), controller.lockGrades);
router.get('/students/:studentId', requireAccess(['teacher', 'admin', 'owner', 'parent', 'student'], ['grades.manage']), controller.getByStudent);

module.exports = router;
