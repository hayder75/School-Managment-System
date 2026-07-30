const { Router } = require('express');
const pdf = require('../../services/pdf.service');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');

const router = Router();
router.use(auth);
router.use(tenant);

router.get('/report-card/:studentId', rbac('admin', 'owner', 'teacher', 'student', 'parent'), async (req, res) => {
  try {
    const buf = await pdf.generateReportCard(req.tenant.id, req.params.studentId, req.query.year);
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
    const buf = await pdf.generateInvoice(req.tenant.id, req.params.studentId);
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
