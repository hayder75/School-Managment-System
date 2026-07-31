const { Router } = require('express');
const controller = require('./students.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const {
  createStudentSchema, updateStudentSchema, enrollSchema,
  promoteSchema, graduateSchema, transferSchema,
  documentSchema, medicalSchema,
  disciplineSchema, disciplineUpdateSchema,
  achievementSchema,
} = require('./students.validation');

const router = Router();

router.use(auth);
router.use(tenant);

router.get('/enrollment-stats', rbac('admin', 'owner'), controller.enrollmentStats);
router.get('/class/:classId', rbac('admin', 'owner', 'teacher'), controller.listByClass);

router.post('/enroll', rbac('admin', 'owner'), validate(enrollSchema), controller.enroll);
router.post('/promote', rbac('admin', 'owner'), validate(promoteSchema), controller.promote);
router.post('/graduate', rbac('admin', 'owner'), validate(graduateSchema), controller.graduate);
router.post('/transfer', rbac('admin', 'owner'), validate(transferSchema), controller.transfer);

router.get('/:studentId/documents', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.listDocuments);
router.post('/:studentId/documents', rbac('admin', 'owner'), validate(documentSchema), controller.addDocument);
router.delete('/:studentId/documents/:docId', rbac('admin', 'owner'), controller.removeDocument);

router.get('/:studentId/medical', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.getMedical);
router.put('/:studentId/medical', rbac('admin', 'owner'), validate(medicalSchema), controller.upsertMedical);

router.get('/:studentId/discipline', rbac('admin', 'owner', 'teacher', 'parent'), controller.listDiscipline);
router.post('/:studentId/discipline', rbac('admin', 'owner', 'teacher'), validate(disciplineSchema), controller.addDiscipline);
router.patch('/:studentId/discipline/:recordId', rbac('admin', 'owner'), validate(disciplineUpdateSchema), controller.updateDiscipline);
router.delete('/:studentId/discipline/:recordId', rbac('admin', 'owner'), controller.removeDiscipline);

router.get('/:studentId/achievements', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.listAchievements);
router.post('/:studentId/achievements', rbac('admin', 'owner', 'teacher'), validate(achievementSchema), controller.addAchievement);
router.delete('/:studentId/achievements/:achievementId', rbac('admin', 'owner'), controller.removeAchievement);

router.get('/:studentId/status-history', rbac('admin', 'owner', 'teacher', 'parent'), controller.statusHistory);

router.get('/', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.list);
router.get('/:id', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.getById);
router.post('/', rbac('admin', 'owner'), validate(createStudentSchema), controller.create);
router.put('/:id', rbac('admin', 'owner'), validate(updateStudentSchema), controller.update);
router.delete('/:id', rbac('admin', 'owner'), controller.remove);

module.exports = router;
