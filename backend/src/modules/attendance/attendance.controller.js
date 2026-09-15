const attendanceService = require('./attendance.service');
const access = require('../../shared/access');
const db = require('../../config/database');

async function mark(req, res) {
  const { date, records } = req.validated.body;

  const dateObj = new Date(`${date}T00:00:00`);
  if (Number.isNaN(dateObj.getTime())) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid date' } });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj > today) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot mark attendance for a future date' } });
  }

  if (req.user.role === 'teacher') {
    if (!(await access.isTeacherAssignedToClass(req.tenant.id, req.user.userId, req.params.classId))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only mark attendance for classes you teach' } });
    }
  }

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
  const { userId, role } = req.user;
  if (role === 'teacher' && !(await access.isTeacherAssignedToClass(req.tenant.id, userId, classId))) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view attendance for classes you teach' } });
  }
  if (role === 'parent') {
    const children = await access.getChildrenUserIdsForParent(req.tenant.id, userId);
    if (children.length === 0) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No children linked to your account' } });
    }
    const hasChild = await db('students').where({ tenant_id: req.tenant.id, class_id: classId }).whereIn('user_id', children).first();
    if (!hasChild) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view attendance for your children\'s classes' } });
    }
  }
  const records = await attendanceService.getByClassAndDate(req.tenant.id, classId, date);
  res.json({ success: true, data: records });
}

async function getByStudent(req, res) {
  const canView = await access.canViewStudentByUserId(req.tenant.id, req.user.userId, req.user.role, req.params.studentId);
  if (!canView) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this student' } });
  const { page, limit } = req.query;
  const result = await attendanceService.getByStudent(req.tenant.id, req.params.studentId, { page, limit });
  res.json({ success: true, ...result });
}

async function getSummary(req, res) {
  const { classId } = req.params;
  const { start_date, end_date } = req.query;
  if (!start_date || !end_date) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'start_date and end_date query params are required' },
    });
  }
  const summary = await attendanceService.getSummary(req.tenant.id, classId, start_date, end_date);
  res.json({ success: true, data: summary });
}

async function getTeacherOverview(req, res) {
  const { from_date, to_date, teacher_id, today } = req.query;
  const teacherId = req.user.role === 'teacher' ? req.user.userId : (teacher_id || req.user.userId);
  const data = await attendanceService.getTeacherOverview(req.tenant.id, teacherId, {
    fromDate: from_date,
    toDate: to_date,
    classId: req.query.class_id,
    today,
  });
  res.json({ success: true, data });
}

async function getClassStats(req, res) {
  const { classId } = req.params;
  const { period, from_date, to_date, today } = req.query;

  if (req.user.role === 'teacher') {
    if (!(await access.isTeacherAssignedToClass(req.tenant.id, req.user.userId, classId))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view stats for classes you teach' } });
    }
  }

  const data = await attendanceService.getClassStats(req.tenant.id, classId, {
    period,
    fromDate: from_date,
    toDate: to_date,
    today,
  });
  if (!data) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class not found' } });
  }
  res.json({ success: true, data });
}

async function getAdminOverview(req, res) {
  const { from_date, to_date, class_id } = req.query;
  const data = await attendanceService.getAdminOverview(req.tenant.id, {
    fromDate: from_date,
    toDate: to_date,
    classId: class_id,
  });
  res.json({ success: true, data });
}

async function getAdminClassOverview(req, res) {
  const { classId } = req.params;
  const { from_date, to_date } = req.query;
  const data = await attendanceService.getAdminClassOverview(req.tenant.id, classId, {
    fromDate: from_date,
    toDate: to_date,
  });
  if (!data) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Class not found' } });
  }
  res.json({ success: true, data });
}

module.exports = { mark, getByClassAndDate, getByStudent, getSummary, getAdminOverview, getAdminClassOverview, getTeacherOverview, getClassStats };
