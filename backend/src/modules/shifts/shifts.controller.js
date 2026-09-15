const service = require('./shifts.service');

async function listSubstitutions(req, res) {
  const tenantId = req.tenant.id;
  const { date, from, to, status, teacherId } = req.query;
  const subs = await service.listSubstitutions(tenantId, { date, from, to, status, teacherId });
  res.json({ success: true, data: subs });
}

async function getAvailableTeachers(req, res) {
  const tenantId = req.tenant.id;
  const teachers = await service.getAvailableTeachers(tenantId);
  res.json({ success: true, data: teachers });
}

async function createSubstitution(req, res) {
  const tenantId = req.tenant.id;
  const userId = req.user.userId || req.user.id;
  const sub = await service.createSubstitution(tenantId, userId, req.body);
  res.status(201).json({ success: true, data: sub });
}

async function updateStatus(req, res) {
  const tenantId = req.tenant.id;
  const { id } = req.params;
  const { status } = req.body;
  const sub = await service.updateSubstitutionStatus(tenantId, id, status);
  res.json({ success: true, data: sub });
}

async function getLiveRoster(req, res) {
  const tenantId = req.tenant.id;
  const { date } = req.query;
  const roster = await service.getLiveShiftRoster(tenantId, { date });
  res.json({ success: true, data: roster });
}

async function listGuardShifts(req, res) {
  const tenantId = req.tenant.id;
  const { date, shiftType, status } = req.query;
  const shifts = await service.listGuardShifts(tenantId, { date, shiftType, status });
  res.json({ success: true, data: shifts });
}

async function createGuardShift(req, res) {
  const tenantId = req.tenant.id;
  const userId = req.user.userId || req.user.id;
  const created = await service.createGuardShift(tenantId, userId, req.body);
  res.status(201).json({ success: true, data: created });
}

async function updateGuardShift(req, res) {
  const tenantId = req.tenant.id;
  const { id } = req.params;
  const updated = await service.updateGuardShift(tenantId, id, req.body);
  res.json({ success: true, data: updated });
}

async function deleteGuardShift(req, res) {
  const tenantId = req.tenant.id;
  const { id } = req.params;
  await service.deleteGuardShift(tenantId, id);
  res.json({ success: true, message: 'Deleted successfully' });
}

async function getReports(req, res) {
  const tenantId = req.tenant.id;
  const reports = await service.getShiftReports(tenantId);
  res.json({ success: true, data: reports });
}

module.exports = {
  listSubstitutions,
  getAvailableTeachers,
  createSubstitution,
  updateStatus,
  getLiveRoster,
  listGuardShifts,
  createGuardShift,
  updateGuardShift,
  deleteGuardShift,
  getReports,
};
