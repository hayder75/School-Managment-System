const { Router } = require('express');
const controller = require('./kg-schedule.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

const SCHEDULE_ROLES = [
  'owner', 'admin', 'general_manager', 'principal', 'vice_principal', 'quality_director', 'hr', 'super_admin',
];

router.get('/', requireAccess([...SCHEDULE_ROLES, 'teacher', 'student', 'parent'], ['timetable.manage', 'timetable.view']), controller.get);
router.put('/', requireAccess(SCHEDULE_ROLES, ['timetable.manage']), controller.save);

module.exports = router;