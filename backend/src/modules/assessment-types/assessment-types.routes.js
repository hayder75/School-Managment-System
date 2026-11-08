const { Router } = require('express');
const controller = require('./assessment-types.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createTypeSchema, updateTypeSchema } = require('./assessment-types.validation');

const router = Router();

router.use(auth);
router.use(tenant);

const READ_ROLES = [
  'owner', 'admin', 'teacher', 'principal', 'vice_principal', 'quality_director',
  'general_manager', 'hr', 'super_admin', 'Unit Leader',
];

router.get('/', requireAccess(READ_ROLES, ['exams.manage', 'grades.manage', 'timetable.view']), controller.list);
router.post('/', requireAccess(['owner', 'admin'], ['exams.manage']), validate(createTypeSchema), controller.create);
router.patch('/:id', requireAccess(['owner', 'admin'], ['exams.manage']), validate(updateTypeSchema), controller.update);
router.delete('/:id', requireAccess(['owner', 'admin'], ['exams.manage']), controller.remove);

module.exports = router;
