const { Router } = require('express');
const controller = require('./reports.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');

const router = Router();

router.use(auth);
router.use(tenant);

// Admin/Owner reports
router.get('/semester-results', requireAccess(['admin', 'owner', 'general_manager', 'principal', 'vice_principal', 'quality_director', 'teacher'], ['reports.view']), controller.getSemesterResults);
// Report card meta: remarks + publish gate
async function resolveStudentRecordId(tenantId, studentId) {
  const db = require('../../config/database');
  const row = await db('students')
    .where({ tenant_id: tenantId })
    .where(function () { this.where('id', studentId).orWhere('user_id', studentId); })
    .select('id')
    .first();
  return row?.id || null;
}

router.get('/report-card-meta', requireAccess(['admin', 'owner', 'general_manager', 'principal', 'vice_principal', 'quality_director', 'teacher'], ['reports.view']), async (req, res) => {
  const { term_id } = req.query;
  const db = require('../../config/database');
  const sid = await resolveStudentRecordId(req.tenant.id, req.query.student_id);
  if (!sid) return res.json({ success: true, data: { remarks: '', published: false } });
  const row = await db('report_card_meta')
    .where({ tenant_id: req.tenant.id, student_id: sid, term_id })
    .first();
  res.json({ success: true, data: row || { remarks: '', published: false } });
});

router.put('/report-card-meta', requireAccess(['admin', 'owner', 'principal', 'vice_principal'], ['discipline.manage', 'reports.view']), async (req, res) => {
  const db = require('../../config/database');
  const { term_id, remarks, published } = req.body;
  const student_id = await resolveStudentRecordId(req.tenant.id, req.body.student_id);
  if (!student_id || !term_id) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'student_id and term_id are required' } });
  }
  const existing = await db('report_card_meta')
    .where({ tenant_id: req.tenant.id, student_id, term_id }).first();
  const payload = {
    remarks: remarks !== undefined ? remarks : existing?.remarks || '',
    published: published !== undefined ? !!published : existing?.published || false,
  };
  if (payload.published && !existing?.published_at) {
    payload.published_at = db.fn.now();
    payload.published_by = req.user.userId;
  }
  if (!existing) {
    await db('report_card_meta').insert({ tenant_id: req.tenant.id, student_id, term_id, ...payload });
  } else {
    await db('report_card_meta').where({ id: existing.id }).update(payload);
  }
  res.json({ success: true, data: await db('report_card_meta').where({ tenant_id: req.tenant.id, student_id, term_id }).first() });
});

router.get('/enrollment', requireAccess(['admin', 'owner'], ['reports.view']), controller.getEnrollmentReport);
router.get('/grade-distribution', requireAccess(['admin', 'owner', 'teacher'], ['reports.view']), controller.getGradeDistribution);
router.get('/class-performance', requireAccess(['admin', 'owner'], ['reports.view']), controller.getClassPerformance);
router.get('/attendance-overview', requireAccess(['admin', 'owner'], ['reports.view']), controller.getAttendanceOverview);
router.get('/teacher-workload', requireAccess(['admin', 'owner'], ['reports.view']), controller.getTeacherWorkload);

// Teacher reports
router.get('/my-students', requireAccess(['teacher'], ['reports.view']), controller.getTeacherClassStudents);
router.get('/my-class-summary', requireAccess(['teacher'], ['reports.view']), controller.getTeacherClassSummary);
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
