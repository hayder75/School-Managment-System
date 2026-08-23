const { Router } = require('express');
const ctrl = require('./hr.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();
router.use(auth);
router.use(tenant);

// Staff Attendance Routes
router.get('/teacher-attendance', requireAccess(['admin', 'owner', 'hr', 'shift_coordinator', 'principal', 'vice_principal'], ['payroll.view', 'reports.view', 'leave.view', 'shifts.manage']), ctrl.listStaffAttendance);
router.get('/teacher-attendance/summary', requireAccess(['admin', 'owner', 'hr', 'shift_coordinator', 'principal', 'vice_principal'], ['payroll.view', 'reports.view', 'leave.view', 'shifts.manage']), ctrl.getStaffAttendanceSummary);
router.post('/teacher-attendance/bulk', requireAccess(['admin', 'owner', 'hr', 'shift_coordinator'], ['payroll.view', 'shifts.manage']), ctrl.bulkMarkAttendance);

// Teacher KPI Routes
router.get('/teacher-kpis', requireAccess(['admin', 'owner', 'hr', 'teacher', 'principal', 'vice_principal', 'quality_director'], ['reports.view', 'quality.review']), ctrl.listTeacherKpis);
router.get('/teacher-kpis/summary', requireAccess(['admin', 'owner', 'hr', 'principal', 'vice_principal', 'quality_director'], ['reports.view', 'quality.review']), ctrl.getKpiSummary);
router.post('/teacher-kpis', requireAccess(['admin', 'owner', 'hr', 'principal', 'quality_director'], ['payroll.view', 'quality.review']), ctrl.saveTeacherKpi);

module.exports = router;
