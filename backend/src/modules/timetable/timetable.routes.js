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

router.post('/', requireAccess(['admin', 'owner', 'teacher'], ['timetable.manage']), validate(createEntrySchema), controller.create);
router.get('/classes/:classId', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['timetable.view']), controller.getByClass);
router.get('/teachers/:teacherId', requireAccess(['admin', 'owner', 'teacher'], ['timetable.view']), controller.getByTeacher);
router.put('/:id', requireAccess(['admin', 'owner'], ['timetable.manage']), validate(updateEntrySchema), controller.update);
router.delete('/:id', requireAccess(['admin', 'owner'], ['timetable.manage']), controller.remove);

module.exports = router;
