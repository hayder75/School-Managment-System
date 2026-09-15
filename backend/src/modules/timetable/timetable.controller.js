const timetableService = require('./timetable.service');
const access = require('../../shared/access');
const db = require('../../config/database');

const TIMETABLE_MANAGER_ROLES = ['admin', 'owner', 'hr', 'quality_director'];

async function create(req, res) {
  const { userId, role } = req.user;
  const body = { ...req.validated.body };
  const isManager = TIMETABLE_MANAGER_ROLES.includes(role);

  if (role === 'teacher') {
    body.teacher_id = userId;
  }

  // Managers (HR, Quality Director, admin, owner) have full authority to assign
  // any teacher; other roles must be assigned to the subject in that class.
  if (body.teacher_id && !isManager) {
    const assignment = await db('teacher_subjects')
      .where({
        tenant_id: req.tenant.id,
        teacher_id: body.teacher_id,
        subject_id: body.subject_id,
        class_id: body.class_id,
      })
      .first();
    if (!assignment) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ASSIGNMENT', message: 'Teacher is not assigned to this subject in this class' },
      });
    }
  } else if (!body.teacher_id && !isManager) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only timetable managers can create entries without a teacher' },
    });
  }

  const conflict = await timetableService.findConflict(req.tenant.id, body);
  if (conflict) {
    const message = conflict.scope === 'teacher'
      ? `${conflict.teacher_name || 'This teacher'} is already teaching ${conflict.subject_name || 'another subject'} (${String(conflict.start_time).slice(0, 5)}-${String(conflict.end_time).slice(0, 5)}) in ${conflict.class_name || 'another class'} at that time`
      : `This time slot is already occupied by ${conflict.subject_name || 'another subject'}${conflict.teacher_name ? ` (${conflict.teacher_name})` : ''} (${String(conflict.start_time).slice(0, 5)}-${String(conflict.end_time).slice(0, 5)})`;
    return res.status(409).json({
      success: false,
      error: { code: 'SLOT_OCCUPIED', message },
    });
  }

  const entry = await timetableService.createEntry(req.tenant.id, body);
  res.status(201).json({ success: true, data: entry });
}

async function getByClass(req, res) {
  const { userId, role } = req.user;
  let classId = req.params.classId;

  if (role === 'student') {
    const student = await access.getStudentForUser(req.tenant.id, userId);
    if (!student || !student.class_id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No class assigned to your account' } });
    }
    classId = student.class_id;
  } else if (role === 'parent') {
    const children = await db('student_parents')
      .where({ 'student_parents.tenant_id': req.tenant.id, 'student_parents.parent_id': userId })
      .leftJoin('students', 'student_parents.student_id', 'students.id')
      .select('students.class_id');
    const allowed = children.map((c) => c.class_id).filter(Boolean);
    if (!allowed.includes(classId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view your children\'s classes' } });
    }
  } else if (role === 'teacher') {
    if (!(await access.isTeacherAssignedToClass(req.tenant.id, userId, classId))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You are not assigned to this class' } });
    }
  }

  const entries = await timetableService.getByClass(req.tenant.id, classId);
  res.json({ success: true, data: entries });
}

async function getByTeacher(req, res) {
  const { userId, role } = req.user;
  let teacherId = req.params.teacherId;

  if (role === 'teacher') {
    teacherId = userId;
  }

  const entries = await timetableService.getByTeacher(req.tenant.id, teacherId);
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
