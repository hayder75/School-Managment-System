const timetableService = require('./timetable.service');

async function create(req, res) {
  const entry = await timetableService.createEntry(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: entry });
}

async function getByClass(req, res) {
  const entries = await timetableService.getByClass(req.tenant.id, req.params.classId);
  res.json({ success: true, data: entries });
}

async function getByTeacher(req, res) {
  const entries = await timetableService.getByTeacher(req.tenant.id, req.params.teacherId);
  res.json({ success: true, data: entries });
}

async function update(req, res) {
  const entry = await timetableService.updateEntry(req.tenant.id, req.params.id, req.validated.body);
  if (!entry) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } });
  res.json({ success: true, data: entry });
}

async function remove(req, res) {
  await timetableService.deleteEntry(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

module.exports = { create, getByClass, getByTeacher, update, remove };
