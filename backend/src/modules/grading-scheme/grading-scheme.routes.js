const { Router } = require('express');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const grading = require('../../shared/grading');
const assessmentTypes = require('../assessment-types/assessment-types.service');
const audit = require('../../shared/audit');

const router = Router();

router.use(auth);
router.use(tenant);

const READ_ROLES = [
  'owner', 'admin', 'teacher', 'principal', 'vice_principal',
  'quality_director', 'general_manager', 'super_admin', 'Unit Leader',
];

router.get('/', requireAccess(READ_ROLES, ['exams.manage', 'grades.manage', 'reports.view']), async (req, res) => {
  const [scheme, types] = await Promise.all([
    grading.getScheme(req.tenant.id),
    assessmentTypes.list(req.tenant.id),
  ]);
  res.json({ success: true, data: { scheme, types } });
});

router.put('/', requireAccess(['owner', 'admin'], ['exams.manage']), async (req, res) => {
  try {
    const before = await grading.getScheme(req.tenant.id);
    const scheme = await grading.saveScheme(req.tenant.id, req.body || {});
    await audit.record(req, 'update', 'grading_scheme', null, before, scheme);
    res.json({ success: true, data: scheme });
  } catch (err) {
    if (err.code === 'WEIGHTS_MUST_TOTAL_100') {
      return res.status(400).json({
        success: false,
        error: { code: err.code, message: `Weights must add up to 100 — they currently add up to ${err.total}` },
      });
    }
    if (err.code === 'WEIGHTS_REQUIRED') {
      return res.status(400).json({
        success: false,
        error: { code: err.code, message: 'Add at least one weighted assessment type' },
      });
    }
    throw err;
  }
});

module.exports = router;
