const announcementsService = require('./announcements.service');

async function create(req, res) {
  const announcement = await announcementsService.create(    req.tenant.id, req.user.userId, req.validated.body);
  res.status(201).json({ success: true, data: announcement });
}

async function list(req, res) {
  const { page, limit, audience } = req.query;
  const result = await announcementsService.findAll(req.tenant.id, { page, limit, audience });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const announcement = await announcementsService.findById(req.tenant.id, req.params.id);
  if (!announcement) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Announcement not found' } });
  res.json({ success: true, data: announcement });
}

async function update(req, res) {
  const announcement = await announcementsService.update(req.tenant.id, req.params.id, req.validated.body);
  if (!announcement) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Announcement not found' } });
  res.json({ success: true, data: announcement });
}

async function remove(req, res) {
  await announcementsService.remove(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

async function listForUser(req, res) {
  const classId = req.query.class_id || null;
  const announcements = await announcementsService.findForUser(req.tenant.id, req.user.userId, req.user.role, classId);
  res.json({ success: true, data: announcements });
}

module.exports = { create, list, getById, update, remove, listForUser };
