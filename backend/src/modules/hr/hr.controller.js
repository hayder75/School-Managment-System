const service = require('./hr.service');

async function listStaffAttendance(req, res) {
  const tenantId = req.tenant.id;
  const { date, month, staffId, role, search, from, to } = req.query;
  const data = await service.listStaffAttendance(tenantId, { date, month, staffId, role, search, from, to });
  res.json({ success: true, data });
}

async function getStaffAttendanceSummary(req, res) {
  const tenantId = req.tenant.id;
  const { date, role } = req.query;
  const summary = await service.getStaffAttendanceSummary(tenantId, {
    date: date || new Date().toISOString().split('T')[0],
    role,
  });
  res.json({ success: true, data: summary });
}

async function getStaffAttendanceGrid(req, res) {
  const tenantId = req.tenant.id;
  const { week_start, role, search } = req.query;
  const data = await service.getStaffAttendanceGrid(tenantId, { weekStart: week_start, role, search });
  res.json({ success: true, data });
}

async function getStaffUnavailability(req, res) {
  const { from, to } = req.query;
  const data = await service.getStaffUnavailability(req.tenant.id, { from, to });
  res.json({ success: true, data });
}

async function getStaffAttendanceStats(req, res) {
  const tenantId = req.tenant.id;
  const { from, to, staff_id, role, search } = req.query;
  const data = await service.getStaffAttendanceStats(tenantId, { from, to, staffId: staff_id, role, search });
  res.json({ success: true, data });
}

async function getStaffAttendanceSettings(req, res) {
  const data = await service.getStaffAttendanceSettings(req.tenant.id);
  res.json({ success: true, data });
}

async function updateStaffAttendanceSettings(req, res) {
  const data = await service.updateStaffAttendanceSettings(req.tenant.id, req.body);
  res.json({ success: true, data });
}

async function bulkMarkAttendance(req, res) {
  const tenantId = req.tenant.id;
  const recordedBy = req.user.userId || req.user.id;
  const { date, records } = req.body;

  if (Array.isArray(req.body.entries)) {
    const result = await service.bulkMarkRange(tenantId, recordedBy, { entries: req.body.entries });
    return res.json({ success: true, data: result });
  }

  const result = await service.bulkMarkAttendance(tenantId, recordedBy, { date, records });
  res.json({ success: true, data: result });
}

async function listTeacherKpis(req, res) {
  const tenantId = req.tenant.id;
  const { periodName, teacherId } = req.query;
  const data = await service.listTeacherKpis(tenantId, { periodName, teacherId });
  res.json({ success: true, data });
}

async function saveTeacherKpi(req, res) {
  const tenantId = req.tenant.id;
  const evaluatedBy = req.user.userId || req.user.id;
  const result = await service.saveTeacherKpi(tenantId, evaluatedBy, req.body);
  res.json({ success: true, data: result });
}

async function getKpiSummary(req, res) {
  const tenantId = req.tenant.id;
  const summary = await service.getKpiSummary(tenantId);
  res.json({ success: true, data: summary });
}

async function getHomeroom(req, res) {
  const data = await service.getHomeroom(req.tenant.id);
  res.json({ success: true, data });
}

async function setHomeroom(req, res) {
  try {
    const cls = await service.setHomeroom(req.tenant.id, req.params.classId, req.body.teacher_id || null);
    if (!cls) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class not found' } });
    res.json({ success: true, data: cls });
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'Teacher not found' } });
    }
    throw err;
  }
}

module.exports = {
  getHomeroom,
  setHomeroom,
  listStaffAttendance,
  getStaffAttendanceSummary,
  getStaffAttendanceGrid,
  getStaffAttendanceStats,
  getStaffUnavailability,
  getStaffAttendanceSettings,
  updateStaffAttendanceSettings,
  bulkMarkAttendance,
  listTeacherKpis,
  saveTeacherKpi,
  getKpiSummary,
};
