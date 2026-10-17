const { Router } = require('express');
const pdf = require('../../services/pdf.service');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const access = require('../../shared/access');
const db = require('../../config/database');

const router = Router();
router.use(auth);
router.use(tenant);

// Accept either the students record id or the users.id; resolve to the user id.
async function resolveStudentUserId(tenantId, param) {
  const student = await db('students')
    .where({ 'students.tenant_id': tenantId })
    .where(function () {
      this.where('students.user_id', param).orWhere('students.id', param);
    })
    .select('students.user_id')
    .first();
  return student?.user_id || null;
}

router.get('/report/:id', rbac('admin', 'owner', 'general_manager', 'principal', 'vice_principal', 'quality_director', 'hr', 'finance', 'accountant', 'cashier', 'shift_coordinator', 'security_head', 'general_services', 'teacher', 'student', 'parent'), async (req, res, next) => {
  try {
    const ok = await pdf.generateReportPdf(req.params.id, req.tenant.id, req.user.userId, req.query, res);
    if (!ok) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } });
  } catch (err) {
    next(err);
  }
});

router.get('/report-overview', rbac('admin', 'owner', 'general_manager', 'principal', 'vice_principal', 'quality_director', 'hr', 'finance', 'accountant'), async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="school-overview.pdf"');
    await pdf.generateOverviewPdf(req.tenant.id, { from: req.query.from, to: req.query.to }, res);
  } catch (err) {
    next(err);
  }
});

router.get('/report-card/:studentId', rbac('admin', 'owner', 'teacher', 'student', 'parent', 'principal', 'vice_principal', 'quality_director', 'general_manager'), async (req, res) => {
  try {
    const userId = await resolveStudentUserId(req.tenant.id, req.params.studentId);
    if (!userId) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
    const isStaff = ['admin', 'owner', 'teacher', 'principal', 'vice_principal', 'quality_director', 'general_manager'].includes(req.user.role);
    if (!isStaff) {
      const canView = await access.canViewStudentByUserId(req.tenant.id, req.user.userId, req.user.role, userId);
      if (!canView) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this student' } });
      // Publish gate: families can only download once the school publishes it
      if (req.query.term_id) {
        const meta = await db('report_card_meta')
          .where({ tenant_id: req.tenant.id, term_id: req.query.term_id })
          .andWhere('student_id', function () {
            this.select('students.id').from('students').where('students.user_id', userId).limit(1);
          })
          .first();
        if (!meta || !meta.published) {
          return res.status(403).json({ success: false, error: { code: 'NOT_PUBLISHED', message: 'This report card has not been published yet.' } });
        }
      }
    }
    const buf = await pdf.generateReportCard(req.tenant.id, userId, req.query.year, req.query.term_id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report-card.pdf');
    res.send(buf);
  } catch (err) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
    throw err;
  }
});

// Mass download: ZIP containing one PDF per student, named by student.
// Query: class_id, term_id (optional student_ids=csv to limit to selected).
router.get('/report-cards/download', rbac('admin', 'owner', 'principal', 'vice_principal', 'quality_director', 'general_manager', 'teacher'), async (req, res, next) => {
  try {
    const { class_id, term_id, student_ids } = req.query;
    if (!class_id || !term_id) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'class_id and term_id are required' } });
    const cls = await db('classes').where({ tenant_id: req.tenant.id, id: class_id }).first();
    if (!cls) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class not found' } });

    let userIds = null;
    if (student_ids) {
      userIds = String(student_ids).split(',').map((x) => x.trim()).filter(Boolean);
      if (!userIds.length) userIds = null;
    }
    const payloads = await pdf.buildCardPayloads(req.tenant.id, term_id, class_id, userIds);
    if (!payloads.length) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No students to export' } });

    const archiver = require('archiver');
    const reportCard = require('../../shared/report-card');
    const folder = `${cls.name} Report Cards`.replace(/[\\/:*?"<>|]/g, '-');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${folder}.zip"`);
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('warning', (e) => { if (e.code !== 'ENOENT') throw e; });
    archive.on('error', () => { if (!res.headersSent) res.status(500); res.end(); });
    archive.pipe(res);

    for (const p of payloads) {
      const buf = await reportCard.generateReportCard(p, null, p.attendance, { name: p.termLabel });
      const safe = (p.studentName || 'student').replace(/[\\/:*?"<>|]/g, '-').trim();
      archive.append(buf, { name: `${folder}/${safe}.pdf` });
    }
    await archive.finalize();
  } catch (err) { next(err); }
});

// Mass print: one combined PDF with every student's report card, in rank order.
router.get('/report-cards/print', rbac('admin', 'owner', 'principal', 'vice_principal', 'quality_director', 'general_manager', 'teacher'), async (req, res, next) => {
  try {
    const { class_id, term_id } = req.query;
    if (!class_id || !term_id) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'class_id and term_id are required' } });
    const cls = await db('classes').where({ tenant_id: req.tenant.id, id: class_id }).first();
    if (!cls) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class not found' } });
    const buf = await pdf.generateClassReportCardsPdf(req.tenant.id, class_id, term_id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${cls.name}-report-cards.pdf"`);
    res.send(buf);
  } catch (err) { next(err); }
});

router.get('/invoice/:studentId', rbac('admin', 'owner', 'finance', 'cashier', 'accountant', 'student', 'parent'), async (req, res) => {
  try {
    const userId = await resolveStudentUserId(req.tenant.id, req.params.studentId);
    if (!userId) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
    if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'finance') {
      const canView = await access.canViewStudentByUserId(req.tenant.id, req.user.userId, req.user.role, userId);
      if (!canView) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this student' } });
    }
    const buf = await pdf.generateInvoice(req.tenant.id, userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
    res.send(buf);
  } catch (err) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
    throw err;
  }
});

router.get('/payslip/:payrollId', rbac('admin', 'owner', 'finance', 'hr'), async (req, res) => {
  try {
    const buf = await pdf.generatePayslip(req.tenant.id, req.params.payrollId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=payslip.pdf');
    res.send(buf);
  } catch (err) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payroll not found' } });
    throw err;
  }
});

module.exports = router;
