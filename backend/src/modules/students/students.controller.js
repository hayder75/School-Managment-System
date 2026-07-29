const studentsService = require('./students.service');

async function create(req, res) {
  const student = await studentsService.create(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: student });
}

async function list(req, res) {
  const { page, limit, class_id, status, search } = req.query;
  const result = await studentsService.findAll(req.tenant.id, { page, limit, class_id, status, search });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const student = await studentsService.findById(req.tenant.id, req.params.id);
  if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
  res.json({ success: true, data: student });
}

async function update(req, res) {
  const student = await studentsService.update(req.tenant.id, req.params.id, req.validated.body);
  if (!student) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Student not found' } });
  res.json({ success: true, data: student });
}

async function remove(req, res) {
  await studentsService.remove(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

async function listByClass(req, res) {
  const students = await studentsService.findByClass(req.tenant.id, req.params.classId);
  res.json({ success: true, data: students });
}

async function promote(req, res) {
  const { from_class_id, to_class_id } = req.body;
  const result = await studentsService.promote(req.tenant.id, from_class_id, to_class_id);
  res.json({ success: true, data: result });
}

async function enrollmentStats(req, res) {
  const stats = await studentsService.getEnrollmentStats(req.tenant.id);
  res.json({ success: true, data: stats });
}

module.exports = { create, list, getById, update, remove, listByClass, promote, enrollmentStats };
