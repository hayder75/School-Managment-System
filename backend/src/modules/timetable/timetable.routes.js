const { Router } = require('express');
const controller = require('./timetable.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { createEntrySchema, updateEntrySchema } = require('./timetable.validation');

const router = Router();

router.use(auth);
router.use(tenant);

const TIMETABLE_MANAGERS = ['admin', 'owner', 'hr', 'quality_director'];

router.post('/', requireAccess(TIMETABLE_MANAGERS, ['timetable.manage']), validate(createEntrySchema), controller.create);
router.get('/classes/:classId', requireAccess([...TIMETABLE_MANAGERS, 'teacher', 'student', 'parent'], ['timetable.view']), controller.getByClass);
router.get('/teachers/:teacherId', requireAccess([...TIMETABLE_MANAGERS, 'teacher'], ['timetable.view']), controller.getByTeacher);
router.put('/:id', requireAccess(TIMETABLE_MANAGERS, ['timetable.manage']), validate(updateEntrySchema), controller.update);
router.delete('/:id', requireAccess(TIMETABLE_MANAGERS, ['timetable.manage']), controller.remove);

module.exports = router;
