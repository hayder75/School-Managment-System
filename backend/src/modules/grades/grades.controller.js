const gradeService = require('./grades.service');
const results = require('../results/results.service');
const access = require('../../shared/access');
const audit = require('../../shared/audit');
const db = require('../../config/database');

async function enterGrades(req, res) {
  const exam = await db('exams')
    .where({ tenant_id: req.tenant.id, id: req.params.examId }).first();
  if (!exam) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
  }

  if (req.user.role === 'teacher') {
    const allowed = await gradeService.getExamClasses(req.tenant.id, req.params.examId, { userId: req.user.userId, role: req.user.role });
    if (!allowed.length) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only enter grades for exams in classes you teach' } });
    }
    const ids = (req.validated.body.grades || []).map((g) => g.student_id);
    const allowedSet = new Set(allowed.map((c) => c.id));
    if (ids.length) {
      const rows = await db('students').where({ tenant_id: req.tenant.id }).whereIn('user_id', ids).select('user_id', 'class_id');
      if (rows.length !== new Set(ids).size || rows.some((r) => !allowedSet.has(r.class_id))) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only grade students in classes you teach' } });
      }
    }
  }

  try {
    const result = await gradeService.upsertGrades(
      req.tenant.id,
      req.params.examId,
      req.validated.body.grades,
      req.user.userId,
      { role: req.user.role }
    );

    // Keep the per-section status/counts in sync for QA and the teacher banner.
    const touchedClasses = new Set();
    const rows = await db('students')
      .where({ tenant_id: req.tenant.id })
      .whereIn('user_id', req.validated.body.grades.map((g) => g.student_id))
      .select('class_id');
    for (const r of rows) touchedClasses.add(r.class_id);
    for (const cid of touchedClasses) {
      await results.recordSave(req.tenant.id, req.params.examId, cid, req.user.userId);
    }

    await audit.record(req, 'update', 'grade', req.params.examId, null, {
      saved: result.saved.length,
      skipped: result.skipped.length,
      exam_id: req.params.examId,
    });

    res.json({
      success: true,
      data: {
        updated: result.saved.length,
        skipped: result.skipped.length,
        skipped_details: result.skipped,
      },
    });
  } catch (err) {
    if (err.code === 'EXAM_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    }
    if (err.code === 'EXAM_LOCKED') {
      return res.status(409).json({ success: false, error: { code: 'EXAM_LOCKED', message: 'Grades are locked for this exam' } });
    }
    if (err.code === 'EXAM_ARCHIVED') {
      return res.status(409).json({ success: false, error: { code: 'EXAM_ARCHIVED', message: 'This exam is archived. Restore it before entering marks.' } });
    }
    if (err.code === 'MARKS_EXCEED_TOTAL') {
      return res.status(400).json({ success: false, error: { code: 'MARKS_EXCEED_TOTAL', message: `Marks cannot exceed the exam total (${err.total})` } });
    }
    throw err;
  }
}

async function getByExam(req, res) {
  const { userId, role } = req.user;
  const exam = await db('exams').where({ tenant_id: req.tenant.id, id: req.params.examId }).first();
  if (!exam) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });

  const classId = req.query.class_id || undefined;

  if (role === 'teacher') {
    const allowed = await gradeService.getExamClasses(req.tenant.id, req.params.examId, { userId, role });
    if (!allowed.length) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view grades for exams in classes you teach' } });
    }
    if (classId && !allowed.some((c) => c.id === classId)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view grades for classes you teach' } });
    }
  } else if (role === 'parent') {
    const children = await access.getChildrenUserIdsForParent(req.tenant.id, userId);
    if (children.length === 0) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No children linked to your account' } });
    }
    const examClassIds = gradeService.examClassIds(exam);
    const hasChild = await db('students')
      .where({ tenant_id: req.tenant.id })
      .whereIn('class_id', examClassIds)
      .whereIn('user_id', children)
      .first();
    if (!hasChild) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: "You can only view grades for your children's exams" } });
    }
  }

  const result = await gradeService.getByExam(req.tenant.id, req.params.examId, { classId, userId, role });
  res.json({
    success: true,
    data: result.rows,
    meta: { status: result.status, submission: result.submission || null, can_edit: result.can_edit },
  });
}

async function getExamClasses(req, res) {
  const data = await gradeService.getExamClasses(req.tenant.id, req.params.examId, {
    userId: req.user.userId,
    role: req.user.role,
  });
  res.json({ success: true, data });
}

async function getByStudent(req, res) {
  const canView = await access.canViewStudentByUserId(req.tenant.id, req.user.userId, req.user.role, req.params.studentId);
  if (!canView) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to this student' } });
  let subjectIds;
  if (req.user.role === 'teacher') {
    subjectIds = await access.teacherSubjectIdsForStudent(req.tenant.id, req.user.userId, req.params.studentId);
  }
  const grades = await gradeService.getByStudent(req.tenant.id, req.params.studentId, subjectIds);
  res.json({ success: true, data: grades });
}

async function lockGrades(req, res) {
  if (req.user.role === 'teacher') {
    const allowed = await gradeService.getExamClasses(req.tenant.id, req.params.examId, { userId: req.user.userId, role: req.user.role });
    if (!allowed.length) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only lock grades for exams in classes you teach' } });
    }
  }
  const result = await gradeService.lockGrades(
    req.tenant.id, req.params.examId, req.validated.body.lock, req.user.userId
  );
  await audit.record(req, result.locked ? 'lock' : 'unlock', 'exam', req.params.examId, null, result);
  res.json({ success: true, data: result });
}

async function saveDraft(req, res) {
  const { examId, classId } = req.params;
  const row = await gradeService.saveDraft(
    req.tenant.id, examId, classId, req.user.userId, req.validated.body.payload
  );
  res.json({ success: true, data: { updated_at: row.updated_at } });
}

async function getDraft(req, res) {
  const { examId, classId } = req.params;
  const row = await gradeService.getDraft(req.tenant.id, examId, classId, req.user.userId);
  res.json({
    success: true,
    data: row ? { payload: row.payload, updated_at: row.updated_at } : null,
  });
}

async function clearDraft(req, res) {
  const { examId, classId } = req.params;
  await gradeService.clearDraft(req.tenant.id, examId, classId, req.user.userId);
  res.json({ success: true, data: null });
}

module.exports = { enterGrades, getByExam, getExamClasses, getByStudent, lockGrades, saveDraft, getDraft, clearDraft };
