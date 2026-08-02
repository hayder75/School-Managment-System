const reportService = require('./reports.service');
const access = require('../../shared/access');

async function getStudentReport(req, res) {
  const canView = await access.canViewStudentByUserId(req.tenant.id, req.user.userId, req.user.role, req.params.studentId);
  if (!canView) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this student' } });
  const subjectIds = req.user.role === 'teacher'
    ? await access.teacherSubjectIdsForStudent(req.tenant.id, req.user.userId, req.params.studentId)
    : undefined;
  const report = await reportService.getStudentReport(req.tenant.id, req.params.studentId, subjectIds);
  if (!report) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
  res.json({ success: true, data: report });
}

async function getClassReport(req, res) {
  if (req.user.role === 'teacher' && !(await access.isTeacherAssignedToClass(req.tenant.id, req.user.userId, req.params.classId))) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view reports for classes you teach' } });
  }
  const report = await reportService.getClassReport(req.tenant.id, req.params.classId);
  if (!report) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class not found' } });
  res.json({ success: true, data: report });
}

async function getEnrollmentReport(req, res) {
  const { academic_year_id } = req.query;
  const report = await reportService.getStudentEnrollmentReport(req.tenant.id, { academic_year_id });
  res.json({ success: true, data: report });
}

async function getGradeDistribution(req, res) {
  const { class_id, exam_id } = req.query;
  let scopedClassId = class_id;
  if (req.user.role === 'teacher') {
    const classes = await access.teacherClassIds(req.tenant.id, req.user.userId);
    if (class_id && !classes.includes(class_id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view grade distribution for classes you teach' } });
    }
    if (!class_id) scopedClassId = classes;
  }
  const report = await reportService.getGradeDistributionReport(req.tenant.id, { class_id: scopedClassId, exam_id });
  res.json({ success: true, data: report });
}

async function getClassPerformance(req, res) {
  const { class_id } = req.query;
  const report = await reportService.getClassPerformanceReport(req.tenant.id, { class_id });
  res.json({ success: true, data: report });
}

async function getAttendanceOverview(req, res) {
  const { from_date, to_date, class_id } = req.query;
  const report = await reportService.getAttendanceOverviewReport(req.tenant.id, { from_date, to_date, class_id });
  res.json({ success: true, data: report });
}

async function getTeacherWorkload(req, res) {
  const report = await reportService.getTeacherWorkloadReport(req.tenant.id);
  res.json({ success: true, data: report });
}

async function getTeacherClassStudents(req, res) {
  const { class_id } = req.query;
  if (class_id && req.user.role === 'teacher' && !(await access.isTeacherAssignedToClass(req.tenant.id, req.user.userId, class_id))) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view students in classes you teach' } });
  }
  const report = await reportService.getTeacherClassStudents(req.tenant.id, req.user.userId, class_id);
  res.json({ success: true, data: report });
}

async function getTeacherAttendanceReport(req, res) {
  const { from_date, to_date } = req.query;
  const report = await reportService.getTeacherAttendanceReport(req.tenant.id, req.user.userId, { from_date, to_date });
  res.json({ success: true, data: report });
}

async function getTeacherGradeReport(req, res) {
  const { exam_id } = req.query;
  const report = await reportService.getTeacherGradeReport(req.tenant.id, req.user.userId, { exam_id });
  res.json({ success: true, data: report });
}

async function getFeeCollection(req, res) {
  const { from_date, to_date, class_id } = req.query;
  const report = await reportService.getFeeCollectionReport(req.tenant.id, { from_date, to_date, class_id });
  res.json({ success: true, data: report });
}

async function getOutstandingBalances(req, res) {
  const { class_id } = req.query;
  const report = await reportService.getOutstandingBalanceReport(req.tenant.id, { class_id });
  res.json({ success: true, data: report });
}

async function getRevenueVsExpenses(req, res) {
  const { year } = req.query;
  const report = await reportService.getRevenueVsExpensesReport(req.tenant.id, { year: year ? parseInt(year) : undefined });
  res.json({ success: true, data: report });
}

async function getStaffDirectory(req, res) {
  const { role, status } = req.query;
  const report = await reportService.getStaffDirectoryReport(req.tenant.id, { role, status });
  res.json({ success: true, data: report });
}

async function getPayrollSummary(req, res) {
  const { year } = req.query;
  const report = await reportService.getPayrollSummaryReport(req.tenant.id, { year: year ? parseInt(year) : undefined });
  res.json({ success: true, data: report });
}

async function getHeadcount(req, res) {
  const report = await reportService.getHeadcountReport(req.tenant.id);
  res.json({ success: true, data: report });
}

async function getStudentGradeSummary(req, res) {
  const canView = await access.canViewStudentByUserId(req.tenant.id, req.user.userId, req.user.role, req.params.studentId);
  if (!canView) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this student' } });
  const subjectIds = req.user.role === 'teacher'
    ? await access.teacherSubjectIdsForStudent(req.tenant.id, req.user.userId, req.params.studentId)
    : undefined;
  const report = await reportService.getStudentGradeSummary(req.tenant.id, req.params.studentId, subjectIds);
  res.json({ success: true, data: report });
}

async function getStudentAttendanceSummary(req, res) {
  const canView = await access.canViewStudentByUserId(req.tenant.id, req.user.userId, req.user.role, req.params.studentId);
  if (!canView) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this student' } });
  const { term_id } = req.query;
  const report = await reportService.getStudentAttendanceSummary(req.tenant.id, req.params.studentId, { term_id });
  res.json({ success: true, data: report });
}

module.exports = {
  getStudentReport, getClassReport, getEnrollmentReport,
  getGradeDistribution, getClassPerformance, getAttendanceOverview, getTeacherWorkload,
  getTeacherClassStudents, getTeacherAttendanceReport, getTeacherGradeReport,
  getFeeCollection, getOutstandingBalances, getRevenueVsExpenses,
  getStaffDirectory, getPayrollSummary, getHeadcount,
  getStudentGradeSummary, getStudentAttendanceSummary,
};
