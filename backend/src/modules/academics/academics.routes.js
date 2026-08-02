const { Router } = require('express');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const db = require('../../config/database');

const router = Router();

router.use(auth);
router.use(tenant);
router.use(requireAccess(['admin', 'owner'], ['academics.manage']));

async function rollover(req, res) {
  const { from_year_id, to_year_id } = req.body;
  if (!from_year_id || !to_year_id) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'from_year_id and to_year_id are required' } });
  }

  const fromYear = await db('academic_years').where({ tenant_id: req.tenant.id, id: from_year_id }).first();
  const toYear = await db('academic_years').where({ tenant_id: req.tenant.id, id: to_year_id }).first();
  if (!fromYear || !toYear) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Academic year not found' } });
  }

  const classes = await db('classes').where({ tenant_id: req.tenant.id, academic_year_id: from_year_id });
  const classGradeMap = {};
  for (const cls of classes) {
    const nextGrade = (cls.grade_level || 0) + 1;
    let nextClass = await db('classes')
      .where({ tenant_id: req.tenant.id, academic_year_id: to_year_id, grade_level: nextGrade, section: cls.section })
      .first();
    if (!nextClass) {
      [nextClass] = await db('classes').insert({
        tenant_id: req.tenant.id, academic_year_id: to_year_id,
        name: `${nextGrade}${cls.section || ''}`,
        grade_level: nextGrade, section: cls.section,
        capacity: cls.capacity,
      }).returning('*');
    }
    classGradeMap[cls.id] = nextClass.id;
  }

  const students = await db('students').where({ tenant_id: req.tenant.id, class_id: db.raw('ANY(ARRAY[?]::uuid[])', [Object.keys(classGradeMap)]) });
  let promoted = 0;
  for (const student of students) {
    const newClassId = classGradeMap[student.class_id];
    if (newClassId) {
      await db('students').where({ id: student.id }).update({ class_id: newClassId });
      promoted++;
    }
  }

  await db('academic_years').where({ tenant_id: req.tenant.id, id: from_year_id }).update({ is_current: false });
  await db('academic_years').where({ tenant_id: req.tenant.id, id: to_year_id }).update({ is_current: true });

  res.json({ success: true, data: { promoted, classes_created: Object.keys(classGradeMap).length } });
}

async function graduateStudents(req, res) {
  const { class_id } = req.body;
  const updated = await db('students')
    .where({ tenant_id: req.tenant.id, class_id, status: 'active' })
    .update({ status: 'graduated' });
  res.json({ success: true, data: { graduated: updated } });
}

router.post('/rollover', rollover);
router.post('/graduate', graduateStudents);

module.exports = router;
