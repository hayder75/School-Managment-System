const gradeService = require('./grades.service');
const access = require('../../shared/access');
const db = require('../../config/database');

async function enterGrades(req, res) {
  const exam = await db('exams')
    .where({ tenant_id: req.tenant.id, id: req.params.examId }).first();
  if (!exam) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
  }

  if (req.user.role === 'teacher') {
    if (!(await access.isTeacherAssignedToClassSubject(req.tenant.id, req.user.userId, exam.class_id, exam.subject_id))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only enter grades for exams in classes you teach' } });
    }
  }

  const result = await gradeService.upsertGrades(
    req.tenant.id, req.params.examId, req.validated.body.grades, req.user.userId
  );
  res.json({ success: true, data: { updated: result.length } });
}

async function getByExam(req, res) {
  const { userId, role } = req.user;
  const exam = await db('exams').where({ tenant_id: req.tenant.id, id: req.params.examId }).first();
  if (!exam) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });

  if (role === 'teacher') {
    if (!(await access.isTeacherAssignedToClassSubject(req.tenant.id, userId, exam.class_id, exam.subject_id))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view grades for exams in classes you teach' } });
    }
  } else if (role === 'parent') {
    const children = await access.getChildrenUserIdsForParent(req.tenant.id, userId);
    if (children.length === 0) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No children linked to your account' } });
    }
    const hasChild = await db('students').where({ tenant_id: req.tenant.id, class_id: exam.class_id }).whereIn('user_id', children).first();
    if (!hasChild) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view grades for your children\'s exams' } });
    }
  }

  const grades = await gradeService.getByExam(req.tenant.id, req.params.examId);
  res.json({ success: true, data: grades });
}

async function getByStudent(req, res) {
  const canView = await access.canViewStudentByUserId(req.tenant.id, req.user.userId, req.user.role, req.params.studentId);
  if (!canView) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this student' } });
  const grades = await gradeService.getByStudent(req.tenant.id, req.params.studentId);
  res.json({ success: true, data: grades });
}

async function lockGrades(req, res) {
  if (req.user.role === 'teacher') {
    const exam = await db('exams').where({ tenant_id: req.tenant.id, id: req.params.examId }).first();
    if (!exam) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    if (!(await access.isTeacherAssignedToClassSubject(req.tenant.id, req.user.userId, exam.class_id, exam.subject_id))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only lock grades for exams in classes you teach' } });
    }
  }
  const result = await gradeService.lockGrades(
    req.tenant.id, req.params.examId, req.validated.body.lock, req.user.userId
  );
  res.json({ success: true, data: result });
}

module.exports = { enterGrades, getByExam, getByStudent, lockGrades };
