const { Router } = require('express');
const controller = require('./reports.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();

router.use(auth);
router.use(tenant);

// Admin/Owner reports
router.get('/enrollment', requireAccess(['admin', 'owner'], ['reports.view']), controller.getEnrollmentReport);
router.get('/grade-distribution', requireAccess(['admin', 'owner', 'teacher'], ['reports.view']), controller.getGradeDistribution);
router.get('/class-performance', requireAccess(['admin', 'owner'], ['reports.view']), controller.getClassPerformance);
router.get('/attendance-overview', requireAccess(['admin', 'owner'], ['reports.view']), controller.getAttendanceOverview);
router.get('/teacher-workload', requireAccess(['admin', 'owner'], ['reports.view']), controller.getTeacherWorkload);

// Teacher reports
router.get('/my-students', requireAccess(['teacher'], ['reports.view']), controller.getTeacherClassStudents);
router.get('/my-attendance', requireAccess(['teacher'], ['reports.view']), controller.getTeacherAttendanceReport);
router.get('/my-grades', requireAccess(['teacher'], ['reports.view']), controller.getTeacherGradeReport);

// Finance reports
router.get('/fee-collection', requireAccess(['admin', 'owner', 'finance'], ['reports.view']), controller.getFeeCollection);
router.get('/outstanding', requireAccess(['admin', 'owner', 'finance'], ['reports.view']), controller.getOutstandingBalances);
router.get('/revenue-expenses', requireAccess(['admin', 'owner', 'finance'], ['reports.view']), controller.getRevenueVsExpenses);

// HR reports
router.get('/staff-directory', requireAccess(['admin', 'owner', 'hr'], ['reports.view']), controller.getStaffDirectory);
router.get('/payroll-summary', requireAccess(['admin', 'owner', 'hr', 'finance'], ['reports.view']), controller.getPayrollSummary);
router.get('/headcount', requireAccess(['admin', 'owner', 'hr'], ['reports.view']), controller.getHeadcount);

// Student reports
router.get('/students/:studentId/grades', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['reports.view']), controller.getStudentGradeSummary);
router.get('/students/:studentId/attendance', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['reports.view']), controller.getStudentAttendanceSummary);

// Legacy
router.get('/students/:studentId', requireAccess(['admin', 'owner', 'teacher', 'student', 'parent'], ['reports.view']), controller.getStudentReport);
router.get('/classes/:classId', requireAccess(['admin', 'owner', 'teacher'], ['reports.view']), controller.getClassReport);
router.get('/fees', requireAccess(['admin', 'owner', 'finance'], ['reports.view']), controller.getFeeCollection);

module.exports = router;
