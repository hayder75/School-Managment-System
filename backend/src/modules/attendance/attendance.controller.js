const attendanceService = require('./attendance.service');

async function mark(req, res) {
  const { date, records } = req.validated.body;
  const result = await attendanceService.mark(
    req.tenant.id,
    req.params.classId,
    req.user.userId,
    date,
    records
  );
  res.json({ success: true, data: { count: result.length } });
}

async function getByClassAndDate(req, res) {
  const { classId } = req.params;
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Date query param is required' },
    });
  }
  const records = await attendanceService.getByClassAndDate(req.tenant.id, classId, date);
  res.json({ success: true, data: records });
}

async function getByStudent(req, res) {
  const { page, limit } = req.query;
  const result = await attendanceService.getByStudent(req.tenant.id, req.params.studentId, { page, limit });
  res.json({ success: true, ...result });
}

async function getSummary(req, res) {
  const { classId } = req.params;
  const { start_date, end_date } = req.query;
  const summary = await attendanceService.getSummary(req.tenant.id, classId, start_date, end_date);
  res.json({ success: true, data: summary });
}

module.exports = { mark, getByClassAndDate, getByStudent, getSummary };
