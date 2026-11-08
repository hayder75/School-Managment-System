const { Router } = require('express');
const controller = require('./grades.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { blockReadOnlyWrites } = require('../../middleware/readOnly');
const { enterGradesSchema, lockGradesSchema, draftSchema } = require('./grades.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.post('/exams/:examId', blockReadOnlyWrites, requireAccess(['teacher', 'admin', 'owner', 'quality_director', 'principal', 'vice_principal', 'general_manager'], ['grades.manage']), validate(enterGradesSchema), controller.enterGrades);
router.get('/exams/:examId/classes', requireAccess(['teacher', 'admin', 'owner', 'parent', 'quality_director', 'principal', 'vice_principal', 'general_manager', 'Unit Leader'], ['grades.manage']), controller.getExamClasses);
router.get('/exams/:examId', requireAccess(['teacher', 'admin', 'owner', 'parent', 'quality_director', 'principal', 'vice_principal', 'general_manager', 'Unit Leader'], ['grades.manage']), controller.getByExam);
router.put('/exams/:examId/lock', blockReadOnlyWrites, requireAccess(['teacher', 'admin', 'owner', 'quality_director', 'principal', 'vice_principal', 'general_manager'], ['grades.manage']), validate(lockGradesSchema), controller.lockGrades);

// Autosave drafts (server-side backup of in-progress mark entry).
router.get('/drafts/:examId/:classId', requireAccess(['teacher', 'admin', 'owner', 'Unit Leader'], ['grades.manage']), controller.getDraft);
router.put('/drafts/:examId/:classId', blockReadOnlyWrites, requireAccess(['teacher', 'admin', 'owner'], ['grades.manage']), validate(draftSchema), controller.saveDraft);
router.delete('/drafts/:examId/:classId', blockReadOnlyWrites, requireAccess(['teacher', 'admin', 'owner'], ['grades.manage']), controller.clearDraft);

router.get('/students/:studentId', requireAccess(['teacher', 'admin', 'owner', 'parent', 'student', 'Unit Leader'], ['grades.manage']), controller.getByStudent);

module.exports = router;
