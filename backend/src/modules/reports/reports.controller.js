const reportService = require('./reports.service');
const reportingService = require('./reporting.service');
const shareService = require('./share.service');
const excelService = require('../../services/excel.service');
const access = require('../../shared/access');

async function getReportDetail(req, res) {
  const allowed = reportingService.catalogFor(req.user.role).some((r) => r.id === req.params.id);
  if (!allowed) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Report not available for your role' } });
  const sheets = await excelService.listTables(req.params.id, req.tenant.id, req.user.userId, req.query);
  const tables = sheets.map((s) => ({ name: s.name, total: s.rows.length }));
  const wanted = req.query.table || sheets[0]?.name;
  const sheet = sheets.find((s) => s.name === wanted) || sheets[0];
  if (!sheet) return res.json({ success: true, data: { tables: [], name: null, columns: [], rows: [], total: 0, page: 1, limit: 25 } });
  let rows = sheet.rows;
  const search = String(req.query.search || '').toLowerCase();
  if (search) rows = rows.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(search)));
  const total = rows.length;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(5, parseInt(req.query.limit, 10) || 25));
  const paged = rows.slice((page - 1) * limit, page * limit);
  res.json({ success: true, data: { tables, name: sheet.name, columns: sheet.columns, rows: paged, total, page, limit } });
}

async function exportData(req, res) {
  const ok = await excelService.streamNamedWorkbook(req.params.kind, req.tenant.id, res);
  if (!ok) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Unknown export' } });
}

async function exportExcel(req, res) {
  const allowed = reportingService.catalogFor(req.user.role).some((r) => r.id === req.params.id);
  if (!allowed) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Report not available for your role' } });
  const ok = await excelService.streamWorkbook(req.params.id, req.tenant.id, req.user.userId, req.query, res);
  if (!ok) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } });
}

async function getCatalog(req, res) {
  res.json({ success: true, data: reportingService.catalogFor(req.user.role) });
}

async function getReport(req, res) {
  const allowed = reportingService.catalogFor(req.user.role).some((r) => r.id === req.params.id);
  if (!allowed) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Report not available for your role' } });
  const data = await reportingService.buildReport(req.params.id, req.tenant.id, req.user.userId, req.query);
  if (!data) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } });
  res.json({ success: true, data });
}

async function getOverview(req, res) {
  res.json({ success: true, data: await reportService.getOverviewReport(req.tenant.id, req.query) });
}

async function createShare(req, res) {
  try {
    const { reportId, title, filters, expiresAt, includeNames } = req.body || {};
    const result = await shareService.createShare(req.tenant.id, req.user.userId, {
      reportId, title, filters, expiresAt, includeNames,
    });
    res.status(201).json({ success: true, data: { ...result, url: `/share/r/${result.token}` } });
  } catch (err) {
    if (err.code === 'UNKNOWN_REPORT') {
      return res.status(400).json({ success: false, error: { code: 'UNKNOWN_REPORT', message: 'Unknown report' } });
    }
    throw err;
  }
}

async function listShares(req, res) {
  res.json({ success: true, data: await shareService.listShares(req.tenant.id, req.user.userId, req.user.role) });
}

async function revokeShare(req, res) {
  await shareService.revokeShare(req.tenant.id, req.params.id, req.user.userId, req.user.role);
  res.json({ success: true, data: null });
}

async function getPublicShare(req, res) {
  const data = await shareService.getPublicShare(req.params.token);
  if (!data) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'This link does not exist' } });
  if (data.revoked) return res.status(410).json({ success: false, error: { code: 'REVOKED', message: 'This link has been revoked' } });
  if (data.expired) return res.status(410).json({ success: false, error: { code: 'EXPIRED', message: 'This link has expired' } });
  res.json({ success: true, data });
}


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
  const scopes = await require('../../shared/scope').getUserScopes(req.tenant.id, req.user.userId);
  const report = await reportService.getStudentEnrollmentReport(req.tenant.id, { academic_year_id, scopes });
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

async function getTeacherClassSummary(req, res) {
  const report = await reportService.getTeacherClassSummary(req.tenant.id, req.user.userId);
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

async function getSemesterResults(req, res) {
  try {
    if (req.user.role === 'teacher') {
      const classId = req.query.class_id;
      const assigned = classId && await access.isTeacherAssignedToClass(req.tenant.id, req.user.userId, classId);
      if (!assigned) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view results for classes you teach' } });
      }
    }
    const data = await reportService.getSemesterResults(req.tenant.id, req.query);
    res.json({ success: true, data });
  } catch (err) {
    if (err.code === 'TERM_REQUIRED') {
      return res.status(400).json({ success: false, error: { code: err.code, message: 'term_id is required' } });
    }
    throw err;
  }
}

module.exports = {
  getSemesterResults,
  getStudentReport, getClassReport, getEnrollmentReport,
  getGradeDistribution, getClassPerformance, getAttendanceOverview, getTeacherWorkload,
  getTeacherClassStudents, getTeacherClassSummary, getTeacherAttendanceReport, getTeacherGradeReport,
  getFeeCollection, getOutstandingBalances, getRevenueVsExpenses,
  getStaffDirectory, getPayrollSummary, getHeadcount,
  getStudentGradeSummary, getStudentAttendanceSummary,
  getOverview, createShare, listShares, revokeShare, getPublicShare,
  getCatalog, getReport, exportExcel, getReportDetail, exportData,
};
