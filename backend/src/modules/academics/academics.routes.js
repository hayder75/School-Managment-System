const { Router } = require('express');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const db = require('../../config/database');
const knex = db;

const router = Router();

router.use(auth);
router.use(tenant);

// Read-only term list — needed by leadership & teachers for semester reports
router.get('/terms', async (req, res) => {
  const terms = await db('terms as t')
    .join('academic_years as ay', 't.academic_year_id', 'ay.id')
    .leftJoin('exams as e', function () { this.on('e.term_id', '=', 't.id').andOn('e.tenant_id', '=', 't.tenant_id'); })
    .where('t.tenant_id', req.tenant.id)
    .groupBy('t.id', 't.name', 't.start_date', 't.end_date', 'ay.name', 't.academic_year_id')
    .select(
      't.id', 't.name', 't.start_date', 't.end_date', 'ay.name as year_name',
      't.academic_year_id',
      knex.raw('COUNT(e.id)::int as has_exams')
    )
    .orderBy('t.start_date');
  res.json({ success: true, data: terms });
});

// Terms management — admins only
router.post('/terms', requireAccess(['admin', 'owner'], ['academics.manage']), async (req, res) => {
  const { name, start_date, end_date, academic_year_id } = req.body;
  if (!name || !start_date || !end_date || !academic_year_id) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name, start_date, end_date and academic_year_id are required' } });
  }
  const [term] = await db('terms')
    .insert({ tenant_id: req.tenant.id, name, start_date, end_date, academic_year_id })
    .returning('*');
  res.status(201).json({ success: true, data: term });
});

router.put('/terms/:id', requireAccess(['admin', 'owner'], ['academics.manage']), async (req, res) => {
  const payload = {};
  ['name', 'start_date', 'end_date'].forEach((f) => {
    if (req.body[f] !== undefined) payload[f] = req.body[f];
  });
  const [term] = await db('terms')
    .where({ tenant_id: req.tenant.id, id: req.params.id })
    .update(payload)
    .returning('*');
  if (!term) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Term not found' } });
  res.json({ success: true, data: term });
});

router.delete('/terms/:id', requireAccess(['admin', 'owner'], ['academics.manage']), async (req, res) => {
  const exams = await db('exams').where({ tenant_id: req.tenant.id, term_id: req.params.id }).count('* as c');
  if (Number(exams[0].c) > 0) {
    return res.status(400).json({ success: false, error: { code: 'TERM_IN_USE', message: 'Cannot delete a term that has exams. Remove its exams first.' } });
  }
  const count = await db('terms').where({ tenant_id: req.tenant.id, id: req.params.id }).del();
  if (!count) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Term not found' } });
  res.json({ success: true, data: { deleted: true } });
});

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

router.get('/academic-years', async (req, res) => {
  const years = await db('academic_years').where({ tenant_id: req.tenant.id }).orderBy('start_date', 'desc');
  res.json({ success: true, data: years });
});

module.exports = router;
