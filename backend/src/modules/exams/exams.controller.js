const examService = require('./exams.service');
const access = require('../../shared/access');

async function create(req, res) {
  if (req.user.role === 'teacher') {
    const { class_id, subject_id } = req.validated.body;
    if (!(await access.isTeacherAssignedToClassSubject(req.tenant.id, req.user.userId, class_id, subject_id))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only create exams for classes and subjects you teach' } });
    }
  }
  const exam = await examService.create(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: exam });
}

async function list(req, res) {
  const { page, limit, class_id, subject_id } = req.query;
  const { userId, role } = req.user;
  let scopedClassId = class_id;

  if (role === 'teacher') {
    const classes = await access.teacherClassIds(req.tenant.id, userId);
    if (class_id && !classes.includes(class_id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view exams for classes you teach' } });
    }
    if (!class_id && classes.length > 0) scopedClassId = null;
    const result = await examService.findAllForTeacher(req.tenant.id, { page, limit, class_id, subject_id, teacherId: userId });
    return res.json({ success: true, ...result });
  }

  if (role === 'student') {
    const student = await access.getStudentForUser(req.tenant.id, userId);
    if (!student || !student.class_id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No class assigned to your account' } });
    }
    if (class_id && class_id !== student.class_id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view exams for your class' } });
    }
    scopedClassId = student.class_id;
  }

  if (role === 'parent') {
    const children = await access.getChildrenUserIdsForParent(req.tenant.id, userId);
    if (children.length === 0) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No children linked to your account' } });
    }
    const result = await examService.findAllForStudentUserIds(req.tenant.id, { page, limit, subject_id, studentUserIds: children, requestedClassId: class_id });
    return res.json({ success: true, ...result });
  }

  const result = await examService.findAll(req.tenant.id, { page, limit, class_id: scopedClassId, subject_id });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const { userId, role } = req.user;
  const exam = await examService.findById(req.tenant.id, req.params.id);
  if (!exam) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });

  if (role === 'teacher') {
    if (!(await access.isTeacherAssignedToClassSubject(req.tenant.id, userId, exam.class_id, exam.subject_id))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view exams for classes you teach' } });
    }
  } else if (role === 'student') {
    const student = await access.getStudentForUser(req.tenant.id, userId);
    if (!student || student.class_id !== exam.class_id) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view exams for your class' } });
    }
  } else if (role === 'parent') {
    const children = await access.getChildrenUserIdsForParent(req.tenant.id, userId);
    if (children.length === 0) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No children linked to your account' } });
    }
    const hasChild = await examService.studentInClass(req.tenant.id, children, exam.class_id);
    if (!hasChild) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view exams for your children\'s classes' } });
    }
  }

  res.json({ success: true, data: exam });
}

async function update(req, res) {
  if (req.user.role === 'teacher') {
    const existing = await examService.findById(req.tenant.id, req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    if (!(await access.isTeacherAssignedToClassSubject(req.tenant.id, req.user.userId, existing.class_id, existing.subject_id))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update exams for classes and subjects you teach' } });
    }
  }
  const exam = await examService.update(req.tenant.id, req.params.id, req.validated.body);
  if (!exam) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
  res.json({ success: true, data: exam });
}

async function remove(req, res) {
  try {
    await examService.remove(req.tenant.id, req.params.id);
    res.json({ success: true, data: null });
  } catch (err) {
    if (err.code === 'EXAM_HAS_GRADES') {
      return res.status(409).json({
        success: false,
        error: { code: 'EXAM_HAS_GRADES', message: 'Cannot delete an exam that already has grades recorded' },
      });
    }
    throw err;
  }
}

module.exports = { create, list, getById, update, remove };
