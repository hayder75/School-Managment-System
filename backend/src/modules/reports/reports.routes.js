const { Router } = require('express');
const controller = require('./reports.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');

const router = Router();

router.use(auth);
router.use(tenant);

// Admin/Owner reports
router.get('/enrollment', rbac('admin', 'owner'), controller.getEnrollmentReport);
router.get('/grade-distribution', rbac('admin', 'owner', 'teacher'), controller.getGradeDistribution);
router.get('/class-performance', rbac('admin', 'owner'), controller.getClassPerformance);
router.get('/attendance-overview', rbac('admin', 'owner'), controller.getAttendanceOverview);
router.get('/teacher-workload', rbac('admin', 'owner'), controller.getTeacherWorkload);

// Teacher reports
router.get('/my-students', rbac('teacher'), controller.getTeacherClassStudents);
router.get('/my-attendance', rbac('teacher'), controller.getTeacherAttendanceReport);
router.get('/my-grades', rbac('teacher'), controller.getTeacherGradeReport);

// Finance reports
router.get('/fee-collection', rbac('admin', 'owner', 'finance'), controller.getFeeCollection);
router.get('/outstanding', rbac('admin', 'owner', 'finance'), controller.getOutstandingBalances);
router.get('/revenue-expenses', rbac('admin', 'owner', 'finance'), controller.getRevenueVsExpenses);

// HR reports
router.get('/staff-directory', rbac('admin', 'owner', 'hr'), controller.getStaffDirectory);
router.get('/payroll-summary', rbac('admin', 'owner', 'hr', 'finance'), controller.getPayrollSummary);
router.get('/headcount', rbac('admin', 'owner', 'hr'), controller.getHeadcount);

// Student reports
router.get('/students/:studentId/grades', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.getStudentGradeSummary);
router.get('/students/:studentId/attendance', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.getStudentAttendanceSummary);

// Legacy
router.get('/students/:studentId', rbac('admin', 'owner', 'teacher', 'student', 'parent'), controller.getStudentReport);
router.get('/classes/:classId', rbac('admin', 'owner', 'teacher'), controller.getClassReport);
router.get('/fees', rbac('admin', 'owner', 'finance'), controller.getFeeCollection);

module.exports = router;
