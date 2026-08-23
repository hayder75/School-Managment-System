const service = require('./hr.service');

async function listStaffAttendance(req, res) {
  const tenantId = req.tenant.id;
  const { date, month, staffId } = req.query;
  const data = await service.listStaffAttendance(tenantId, { date, month, staffId });
  res.json({ success: true, data });
}

async function getStaffAttendanceSummary(req, res) {
  const tenantId = req.tenant.id;
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const summary = await service.getStaffAttendanceSummary(tenantId, { date });
  res.json({ success: true, data: summary });
}

async function bulkMarkAttendance(req, res) {
  const tenantId = req.tenant.id;
  const recordedBy = req.user.id;
  const { date, records } = req.body;
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
  const evaluatedBy = req.user.id;
  const result = await service.saveTeacherKpi(tenantId, evaluatedBy, req.body);
  res.json({ success: true, data: result });
}

async function getKpiSummary(req, res) {
  const tenantId = req.tenant.id;
  const summary = await service.getKpiSummary(tenantId);
  res.json({ success: true, data: summary });
}

module.exports = {
  listStaffAttendance,
  getStaffAttendanceSummary,
  bulkMarkAttendance,
  listTeacherKpis,
  saveTeacherKpi,
  getKpiSummary,
};
