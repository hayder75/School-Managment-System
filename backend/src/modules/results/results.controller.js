const service = require('./results.service');
const gradeService = require('../grades/grades.service');
const access = require('../../shared/access');
const audit = require('../../shared/audit');
const db = require('../../config/database');

async function scopedSections(req, examId) {
  const exam = await db('exams').where({ tenant_id: req.tenant.id, id: examId }).first();
  if (!exam) return null;
  const allowed = await gradeService.getExamClasses(req.tenant.id, examId, {
    userId: req.user.userId,
    role: req.user.role,
  });
  return allowed.map((c) => c.id);
}

async function sections(req, res) {
  const examId = req.query.exam_id || req.params.examId;
  if (!examId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'exam_id is required' } });

  let classIds = null;
  if (req.user.role === 'teacher') {
    classIds = await scopedSections(req, examId);
    if (!classIds || !classIds.length) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not teach this exam' } });
    }
  }
  const data = await service.sections(req.tenant.id, examId, { classIds });
  res.json({ success: true, data });
}

async function submit(req, res) {
  const { exam_id, class_id } = req.body;
  if (req.user.role === 'teacher') {
    const allowed = await scopedSections(req, exam_id);
    if (!allowed || !allowed.includes(class_id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only submit results for classes you teach' } });
    }
  }
  try {
    const row = await service.submit(req.tenant.id, exam_id, class_id, req.user.userId);
    await audit.record(req, 'submit', 'result_submission', row.id, null, { exam_id, class_id, status: row.status });
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.code === 'NO_MARKS') {
      return res.status(400).json({ success: false, error: { code: err.code, message: 'Enter at least one mark before submitting' } });
    }
    if (err.code === 'ALREADY_APPROVED') {
      return res.status(409).json({ success: false, error: { code: err.code, message: 'These results are already approved. Request an edit to change them.' } });
    }
    throw err;
  }
}

async function list(req, res) {
  const { status, exam_id, class_id, teacher_id, subject_id, type } = req.query;
  const canReview = await service.canReview(req.tenant.id, req.user.role);
  if (!canReview && !['teacher', 'Unit Leader'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot review results' } });
  }

  let teacherClassIds;
  let teacherSubjectIds;
  if (req.user.role === 'teacher') {
    const pairs = await db('teacher_subjects')
      .where({ tenant_id: req.tenant.id, teacher_id: req.user.userId })
      .select('class_id', 'subject_id');
    teacherClassIds = [...new Set(pairs.map((p) => p.class_id))];
    teacherSubjectIds = [...new Set(pairs.map((p) => p.subject_id))];
  }

  let data = await service.list(req.tenant.id, {
    status,
    exam_id,
    class_id,
    subject_id,
    type,
    teacher_id: req.user.role === 'teacher' ? undefined : teacher_id,
    class_ids: teacherClassIds,
    subject_ids: teacherSubjectIds,
    teacher_self: req.user.role === 'teacher' ? req.user.userId : undefined,
  });

  res.json({ success: true, data });
}

async function summary(req, res) {
  const canReview = await service.canReview(req.tenant.id, req.user.role);
  if (!canReview) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot review results' } });
  }
  const data = await service.summary(req.tenant.id);
  const { roles } = await service.reviewerRoles(req.tenant.id);
  res.json({ success: true, data: { ...data, reviewer_roles: roles } });
}

async function detail(req, res) {
  const canReview = await service.canReview(req.tenant.id, req.user.role);
  if (!canReview) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot review results' } });
  }
  const data = await service.detail(req.tenant.id, req.params.id);
  if (!data) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Submission not found' } });
  res.json({ success: true, data });
}

async function review(req, res) {
  const canReview = await service.canReview(req.tenant.id, req.user.role);
  if (!canReview) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot review results' } });
  }
  const before = await db('result_submissions').where({ tenant_id: req.tenant.id, id: req.params.id }).first();
  if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Submission not found' } });
  try {
    const row = await service.review(req.tenant.id, req.params.id, req.user.userId, req.validated.body);
    await audit.record(req, req.validated.body.decision === 'approve' ? 'approve' : 'return', 'result_submission', row.id, before, row);
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.code === 'COMMENT_REQUIRED') {
      return res.status(400).json({ success: false, error: { code: err.code, message: 'A comment is required when sending results back' } });
    }
    if (err.code === 'NOT_SUBMITTED') {
      return res.status(409).json({ success: false, error: { code: err.code, message: 'These results have not been submitted yet' } });
    }
    throw err;
  }
}

async function comment(req, res) {
  const canReview = await service.canReview(req.tenant.id, req.user.role);
  if (!canReview) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You cannot review results' } });
  }
  const row = await service.addComment(req.tenant.id, req.user.userId, req.params.id, req.validated.body.comment);
  res.status(201).json({ success: true, data: row });
}

async function reviewers(req, res) {
  const { roles, configured } = await service.reviewerRoles(req.tenant.id);
  res.json({ success: true, data: { roles, configured } });
}

async function saveReviewerRoles(req, res) {
  const roles = Array.isArray(req.body?.roles) ? req.body.roles.map(String) : [];
  if (!roles.length) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose at least one approver role' } });
  }
  const allowed = ['quality_director', 'principal', 'vice_principal', 'general_manager'];
  const clean = roles.filter((r) => allowed.includes(r));
  const value = JSON.stringify(clean.length ? clean : ['quality_director']);
  await db('settings')
    .insert({ tenant_id: req.tenant.id, key: 'approvals.result_roles', value })
    .onConflict(['tenant_id', 'key'])
    .merge({ value, updated_at: db.fn.now() });
  await audit.record(req, 'update', 'approval_rule', null, null, { roles: clean });
  res.json({ success: true, data: { roles: clean } });
}

async function myStatus(req, res) {
  const { exam_id, class_id } = req.query;
  const status = await service.statusFor(req.tenant.id, exam_id, class_id);
  res.json({ success: true, data: { status } });
}

module.exports = { sections, submit, list, summary, detail, review, comment, reviewers, saveReviewerRoles, myStatus };
