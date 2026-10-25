const { Router } = require('express');
const ctrl = require('./hr.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

const STAFF_ATT_ROLES = ['admin', 'owner', 'hr', 'shift_coordinator', 'principal', 'vice_principal', 'quality_director', 'face_attendance'];
const STAFF_ATT_PERMS = ['staff-attendance.manage', 'payroll.view', 'reports.view', 'leave.view', 'shifts.manage'];
const STAFF_ATT_EDIT_PERMS = ['staff-attendance.manage', 'shifts.manage'];

// Staff Attendance Routes
router.get('/teacher-attendance', requireAccess(STAFF_ATT_ROLES, STAFF_ATT_PERMS), ctrl.listStaffAttendance);
router.get('/teacher-attendance/summary', requireAccess(STAFF_ATT_ROLES, STAFF_ATT_PERMS), ctrl.getStaffAttendanceSummary);
router.post('/teacher-attendance/bulk', requireAccess(['admin', 'owner', 'hr', 'shift_coordinator', 'principal', 'vice_principal', 'quality_director', 'face_attendance'], STAFF_ATT_EDIT_PERMS), ctrl.bulkMarkAttendance);

// Staff Attendance - weekly grid, stats & deduction settings
router.get('/staff-attendance', requireAccess(STAFF_ATT_ROLES, STAFF_ATT_PERMS), ctrl.listStaffAttendance);
router.get('/staff-attendance/week', requireAccess(STAFF_ATT_ROLES, STAFF_ATT_PERMS), ctrl.getStaffAttendanceGrid);
router.get('/staff-attendance/stats', requireAccess(STAFF_ATT_ROLES, STAFF_ATT_PERMS), ctrl.getStaffAttendanceStats);
router.get('/staff-attendance/summary', requireAccess(STAFF_ATT_ROLES, STAFF_ATT_PERMS), ctrl.getStaffAttendanceSummary);
router.get('/staff-attendance/unavailability', requireAccess(['teacher', 'student', 'parent', 'admin', 'owner', 'hr', 'principal', 'vice_principal', 'quality_director', 'shift_coordinator'], ['timetable.view', 'staff-attendance.manage', 'reports.view']), ctrl.getStaffUnavailability);
router.get('/staff-attendance/settings', requireAccess(STAFF_ATT_ROLES, STAFF_ATT_PERMS), ctrl.getStaffAttendanceSettings);
router.put('/staff-attendance/settings', requireAccess(['admin', 'owner', 'hr', 'principal', 'vice_principal', 'quality_director'], STAFF_ATT_EDIT_PERMS), ctrl.updateStaffAttendanceSettings);
router.post('/staff-attendance/bulk', requireAccess(['admin', 'owner', 'hr', 'shift_coordinator', 'principal', 'vice_principal', 'quality_director', 'face_attendance'], STAFF_ATT_EDIT_PERMS), ctrl.bulkMarkAttendance);

// Teacher KPI Routes
router.get('/teacher-kpis', requireAccess(['admin', 'owner', 'hr', 'teacher', 'principal', 'vice_principal', 'quality_director'], ['reports.view', 'quality.review']), ctrl.listTeacherKpis);
router.get('/teacher-kpis/summary', requireAccess(['admin', 'owner', 'hr', 'principal', 'vice_principal', 'quality_director'], ['reports.view', 'quality.review']), ctrl.getKpiSummary);
router.post('/teacher-kpis', requireAccess(['admin', 'owner', 'hr', 'principal', 'quality_director'], ['payroll.view', 'quality.review']), ctrl.saveTeacherKpi);

// Homeroom teacher assignment
router.get('/homeroom', requireAccess(['admin', 'owner', 'hr', 'principal', 'vice_principal', 'quality_director'], ['staff-attendance.manage', 'reports.view', 'classes.manage']), ctrl.getHomeroom);
router.put('/homeroom/:classId', requireAccess(['admin', 'owner', 'hr'], []), ctrl.setHomeroom);

// Overtime (HR & Finance)
const OT_ROLES = ['admin', 'owner', 'hr', 'finance', 'accountant', 'general_manager', 'principal', 'vice_principal'];
const OT_EDIT_ROLES = ['admin', 'owner', 'hr', 'finance', 'accountant'];
router.get('/overtime', requireAccess(OT_ROLES, ['payroll.view', 'reports.view', 'staff-attendance.manage']), ctrl.listOvertime);
router.get('/overtime/summary', requireAccess(OT_ROLES, ['payroll.view', 'reports.view', 'staff-attendance.manage']), ctrl.getOvertimeSummary);
router.get('/overtime/settings', requireAccess(OT_ROLES, ['payroll.view', 'reports.view', 'staff-attendance.manage']), ctrl.getOvertimeSettings);
router.put('/overtime/settings', requireAccess(['admin', 'owner', 'hr', 'finance', 'accountant'], ['payroll.view', 'staff-attendance.manage']), ctrl.updateOvertimeSettings);
router.post('/overtime', requireAccess(OT_EDIT_ROLES, ['payroll.view', 'staff-attendance.manage']), ctrl.createOvertime);
router.post('/overtime/bulk', requireAccess(OT_EDIT_ROLES, ['payroll.view', 'staff-attendance.manage']), ctrl.bulkCreateOvertime);
router.put('/overtime/:id', requireAccess(OT_EDIT_ROLES, ['payroll.view', 'staff-attendance.manage']), ctrl.updateOvertime);
router.patch('/overtime/:id/approve', requireAccess(OT_EDIT_ROLES, ['payroll.view', 'staff-attendance.manage']), ctrl.approveOvertime);
router.delete('/overtime/:id', requireAccess(OT_EDIT_ROLES, ['payroll.view', 'staff-attendance.manage']), ctrl.deleteOvertime);

module.exports = router;
