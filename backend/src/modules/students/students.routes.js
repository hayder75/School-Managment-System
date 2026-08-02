const { Router } = require('express');
const controller = require('./students.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const {
  createStudentSchema, updateStudentSchema, enrollSchema,
  promoteSchema, graduateSchema, transferSchema,
  documentSchema, medicalSchema,
  disciplineSchema, disciplineUpdateSchema,
  achievementSchema, enrollmentSchema,
} = require('./students.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/enrollment-stats', requireAccess(['admin', 'owner'], ['students.manage']), controller.enrollmentStats);
router.get('/class/:classId', requireAccess(['admin', 'owner', 'teacher'], ['students.view']), controller.listByClass);

router.post('/enroll', requireAccess(['admin', 'owner'], ['students.manage']), validate(enrollSchema), controller.enroll);
router.post('/promote', requireAccess(['admin', 'owner'], ['students.manage']), validate(promoteSchema), controller.promote);
router.post('/graduate', requireAccess(['admin', 'owner'], ['students.manage']), validate(graduateSchema), controller.graduate);
router.post('/transfer', requireAccess(['admin', 'owner'], ['students.manage']), validate(transferSchema), controller.transfer);

router.get('/:studentId/documents', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['students.view']), controller.listDocuments);
router.post('/:studentId/documents', requireAccess(['admin', 'owner'], ['students.manage']), validate(documentSchema), controller.addDocument);
router.delete('/:studentId/documents/:docId', requireAccess(['admin', 'owner'], ['students.manage']), controller.removeDocument);

router.get('/:studentId/medical', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['students.view']), controller.getMedical);
router.put('/:studentId/medical', requireAccess(['admin', 'owner'], ['students.manage']), validate(medicalSchema), controller.upsertMedical);

router.get('/:studentId/discipline', requireAccess(['admin', 'owner', 'teacher', 'parent'], ['students.view']), controller.listDiscipline);
router.post('/:studentId/discipline', requireAccess(['admin', 'owner', 'teacher'], ['students.manage']), validate(disciplineSchema), controller.addDiscipline);
router.patch('/:studentId/discipline/:recordId', requireAccess(['admin', 'owner'], ['students.manage']), validate(disciplineUpdateSchema), controller.updateDiscipline);
router.delete('/:studentId/discipline/:recordId', requireAccess(['admin', 'owner'], ['students.manage']), controller.removeDiscipline);

router.get('/:studentId/achievements', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['students.view']), controller.listAchievements);
router.post('/:studentId/achievements', requireAccess(['admin', 'owner', 'teacher'], ['students.manage']), validate(achievementSchema), controller.addAchievement);
router.delete('/:studentId/achievements/:achievementId', requireAccess(['admin', 'owner'], ['students.manage']), controller.removeAchievement);

router.get('/:studentId/status-history', requireAccess(['admin', 'owner', 'teacher', 'parent'], ['students.view']), controller.statusHistory);

router.get('/:studentId/enrollments', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['students.view']), controller.listEnrollments);
router.post('/:studentId/enrollments', requireAccess(['admin', 'owner'], ['students.manage']), validate(enrollmentSchema), controller.addEnrollment);
router.put('/:studentId/enrollments/:enrollmentId', requireAccess(['admin', 'owner'], ['students.manage']), validate(enrollmentSchema), controller.updateEnrollment);
router.delete('/:studentId/enrollments/:enrollmentId', requireAccess(['admin', 'owner'], ['students.manage']), controller.removeEnrollment);

router.get('/', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['students.view']), controller.list);
router.get('/:id', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['students.view']), controller.getById);
router.post('/', requireAccess(['admin', 'owner'], ['students.manage']), validate(createStudentSchema), controller.create);
router.put('/:id', requireAccess(['admin', 'owner'], ['students.manage']), validate(updateStudentSchema), controller.update);
router.delete('/:id', requireAccess(['admin', 'owner'], ['students.manage']), controller.remove);

module.exports = router;
