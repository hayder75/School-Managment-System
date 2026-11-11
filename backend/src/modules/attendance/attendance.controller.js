const attendanceService = require('./attendance.service');
const access = require('../../shared/access');
const db = require('../../config/database');

const HOMEROOM_MSG = 'Attendance is taken by the homeroom teacher of the class only.';

// Teachers may only touch attendance for a class they are the homeroom teacher of.
async function teacherCanUseClass(tenantId, user, classId) {
  if (user.role !== 'teacher') return true;
  return access.isHomeroomTeacherOfClass(tenantId, user.userId, classId);
}

async function getMyHomeroomClasses(req, res) {
  const classes = await access.homeroomClasses(req.tenant.id, req.user.userId);
  res.json({ success: true, data: { classes } });
}

async function mark(req, res) {
  const { date, session = 'am', records } = req.validated.body;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid date' } });
  }
  // The school day is Africa/Addis_Ababa (UTC+3). Comparing with the server's
  // UTC date rejected "today" between 00:00 and 03:00 local time.
  const todayLocal = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  if (String(date) > todayLocal) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot mark attendance for a future date' } });
  }

  if (!(await teacherCanUseClass(req.tenant.id, req.user, req.params.classId))) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: HOMEROOM_MSG } });
  }

  try {
    const result = await attendanceService.mark(
      req.tenant.id,
      req.params.classId,
      req.user.userId,
      date,
      records,
      session
    );
    res.json({ success: true, data: { count: result.length, session } });
  } catch (err) {
    if (err.code === 'NO_VALID_STUDENTS') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_VALID_STUDENTS',
          message: 'None of those students belong to this class. Nothing was saved — refresh and try again.',
        },
      });
    }
    throw err;
  }
}

async function getByClassAndDate(req, res) {
  const { classId } = req.params;
  const { date, session = 'am' } = req.query;
  if (!date) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Date query param is required' },
    });
  }
  const { userId, role } = req.user;
  if (role === 'teacher' && !(await access.isHomeroomTeacherOfClass(req.tenant.id, userId, classId))) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: HOMEROOM_MSG } });
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
  const records = await attendanceService.getByClassAndDate(req.tenant.id, classId, date, session);
  const cls = await db('classes as c')
    .leftJoin('users as u', 'c.class_teacher_id', 'u.id')
    .where({ 'c.tenant_id': req.tenant.id, 'c.id': classId })
    .select('c.name as class_name', 'u.first_name', 'u.middle_name', 'u.last_name')
    .first();
  const homeroom = cls ? [cls.first_name, cls.middle_name, cls.last_name].filter(Boolean).join(' ') : '';
  res.json({
    success: true,
    data: records,
    meta: {
      class_name: cls?.class_name || null,
      homeroom_teacher_name: homeroom || null,
      session,
      date,
    },
  });
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

  if (req.user.role === 'teacher' && !(await access.isHomeroomTeacherOfClass(req.tenant.id, req.user.userId, classId))) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: HOMEROOM_MSG } });
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

module.exports = { mark, getByClassAndDate, getByStudent, getSummary, getAdminOverview, getAdminClassOverview, getTeacherOverview, getClassStats, getMyHomeroomClasses };
