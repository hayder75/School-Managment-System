const studentsService = require('./students.service');

async function create(req, res) {
  const student = await studentsService.create(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: student });
}

async function enroll(req, res) {
  const student = await studentsService.enroll(req.tenant.id, req.user.userId, req.validated.body);
  res.status(201).json({ success: true, data: student });
}

async function list(req, res) {
  const { page, limit, class_id, status, search, user_id } = req.query;
  const result = await studentsService.findAll(req.tenant.id, { page, limit, class_id, status, search, user_id });
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
  const result = await studentsService.promote(req.tenant.id, req.user.userId, req.validated.body);
  res.json({ success: true, data: result });
}

async function graduate(req, res) {
  const result = await studentsService.graduate(req.tenant.id, req.user.userId, req.validated.body);
  res.json({ success: true, data: result });
}

async function transfer(req, res) {
  const result = await studentsService.transfer(req.tenant.id, req.user.userId, req.validated.body);
  res.json({ success: true, data: result });
}

async function listDocuments(req, res) {
  const docs = await studentsService.getDocuments(req.tenant.id, req.params.studentId);
  res.json({ success: true, data: docs });
}

async function addDocument(req, res) {
  const doc = await studentsService.addDocument(req.tenant.id, req.user.userId, req.params.studentId, req.validated.body);
  res.status(201).json({ success: true, data: doc });
}

async function removeDocument(req, res) {
  await studentsService.removeDocument(req.tenant.id, req.params.studentId, req.params.docId);
  res.json({ success: true, data: null });
}

async function getMedical(req, res) {
  const medical = await studentsService.getMedical(req.tenant.id, req.params.studentId);
  res.json({ success: true, data: medical });
}

async function upsertMedical(req, res) {
  const medical = await studentsService.upsertMedical(req.tenant.id, req.params.studentId, req.validated.body);
  res.json({ success: true, data: medical });
}

async function listDiscipline(req, res) {
  const records = await studentsService.getDiscipline(req.tenant.id, req.params.studentId);
  res.json({ success: true, data: records });
}

async function addDiscipline(req, res) {
  const record = await studentsService.addDiscipline(req.tenant.id, req.user.userId, req.params.studentId, req.validated.body);
  res.status(201).json({ success: true, data: record });
}

async function updateDiscipline(req, res) {
  const data = { ...req.validated.body };
  if (data.status) data.resolved_by = req.user.userId;
  const record = await studentsService.updateDisciplineStatus(req.tenant.id, req.params.studentId, req.params.recordId, data);
  if (!record) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Discipline record not found' } });
  res.json({ success: true, data: record });
}

async function removeDiscipline(req, res) {
  await studentsService.removeDiscipline(req.tenant.id, req.params.studentId, req.params.recordId);
  res.json({ success: true, data: null });
}

async function listAchievements(req, res) {
  const achievements = await studentsService.getAchievements(req.tenant.id, req.params.studentId);
  res.json({ success: true, data: achievements });
}

async function addAchievement(req, res) {
  const achievement = await studentsService.addAchievement(req.tenant.id, req.user.userId, req.params.studentId, req.validated.body);
  res.status(201).json({ success: true, data: achievement });
}

async function removeAchievement(req, res) {
  await studentsService.removeAchievement(req.tenant.id, req.params.studentId, req.params.achievementId);
  res.json({ success: true, data: null });
}

async function statusHistory(req, res) {
  const history = await studentsService.getStatusHistory(req.tenant.id, req.params.studentId);
  res.json({ success: true, data: history });
}

async function enrollmentStats(req, res) {
  const stats = await studentsService.getEnrollmentStats(req.tenant.id);
  res.json({ success: true, data: stats });
}

module.exports = {
  create, enroll, list, getById, update, remove, listByClass,
  promote, graduate, transfer,
  listDocuments, addDocument, removeDocument,
  getMedical, upsertMedical,
  listDiscipline, addDiscipline, updateDiscipline, removeDiscipline,
  listAchievements, addAchievement, removeAchievement,
  statusHistory, enrollmentStats,
};
