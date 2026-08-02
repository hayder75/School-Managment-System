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

router.get('/report-card/:studentId', rbac('admin', 'owner', 'teacher', 'student', 'parent'), async (req, res) => {
  try {
    const userId = await resolveStudentUserId(req.tenant.id, req.params.studentId);
    if (!userId) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      const canView = await access.canViewStudentByUserId(req.tenant.id, req.user.userId, req.user.role, userId);
      if (!canView) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this student' } });
    }
    const buf = await pdf.generateReportCard(req.tenant.id, userId, req.query.year);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report-card.pdf');
    res.send(buf);
  } catch (err) {
    if (err.message === 'NOT_FOUND') return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
    throw err;
  }
});

router.get('/invoice/:studentId', rbac('admin', 'owner', 'finance', 'student', 'parent'), async (req, res) => {
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
