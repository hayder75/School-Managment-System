const examService = require('./exams.service');

async function create(req, res) {
  const exam = await examService.create(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: exam });
}

async function list(req, res) {
  const { page, limit, class_id, subject_id } = req.query;
  const result = await examService.findAll(req.tenant.id, { page, limit, class_id, subject_id });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const exam = await examService.findById(req.tenant.id, req.params.id);
  if (!exam) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
  res.json({ success: true, data: exam });
}

async function update(req, res) {
  const exam = await examService.update(req.tenant.id, req.params.id, req.validated.body);
  if (!exam) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
  res.json({ success: true, data: exam });
}

async function remove(req, res) {
  await examService.remove(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

module.exports = { create, list, getById, update, remove };
