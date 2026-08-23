const { Router } = require('express');
const ctrl = require('./shifts.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

router.get('/live-roster', requireAccess(['admin', 'owner', 'hr', 'shift_coordinator', 'principal', 'vice_principal'], ['shifts.manage', 'leave.view']), ctrl.getLiveRoster);
router.get('/substitutions', requireAccess(['admin', 'owner', 'hr', 'shift_coordinator', 'teacher', 'principal', 'vice_principal'], ['shifts.manage', 'timetable.manage']), ctrl.listSubstitutions);
router.get('/teachers', requireAccess(['admin', 'owner', 'hr', 'shift_coordinator', 'principal', 'vice_principal'], ['shifts.manage', 'timetable.manage']), ctrl.getAvailableTeachers);
router.post('/substitutions', requireAccess(['admin', 'owner', 'hr', 'shift_coordinator'], ['shifts.manage', 'timetable.manage']), ctrl.createSubstitution);
router.patch('/substitutions/:id/status', requireAccess(['admin', 'owner', 'hr', 'shift_coordinator'], ['shifts.manage', 'timetable.manage']), ctrl.updateStatus);

// Guard Shifts (ፈረቃ)
router.get('/guard-shifts', requireAccess(['admin', 'owner', 'shift_coordinator', 'security_head'], ['shifts.manage', 'guard-roster.view']), ctrl.listGuardShifts);
router.post('/guard-shifts', requireAccess(['admin', 'owner', 'shift_coordinator'], ['shifts.manage']), ctrl.createGuardShift);
router.put('/guard-shifts/:id', requireAccess(['admin', 'owner', 'shift_coordinator'], ['shifts.manage']), ctrl.updateGuardShift);
router.delete('/guard-shifts/:id', requireAccess(['admin', 'owner', 'shift_coordinator'], ['shifts.manage']), ctrl.deleteGuardShift);

router.get('/reports', requireAccess(['admin', 'owner', 'hr', 'shift_coordinator', 'principal', 'vice_principal'], ['reports.view']), ctrl.getReports);

module.exports = router;
