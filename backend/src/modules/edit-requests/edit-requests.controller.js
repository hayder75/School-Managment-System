const service = require('./edit-requests.service');
const gradeService = require('../grades/grades.service');
const db = require('../../config/database');
const audit = require('../../shared/audit');

async function create(req, res) {
  const { exam_id, class_id, student_id, reason } = req.validated.body;
  const allowed = await gradeService.getExamClasses(req.tenant.id, exam_id, {
    userId: req.user.userId,
    role: req.user.role,
  });
  if (!allowed.length || !allowed.some((c) => c.id === class_id)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only request edits for classes you teach' } });
  }
  if (student_id) {
    const student = await db('students').where({ tenant_id: req.tenant.id, user_id: student_id }).first();
    if (!student || student.class_id !== class_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'That student is not in this class' } });
    }
  }
  try {
    const row = await service.create(req.tenant.id, { exam_id, class_id, student_id, reason }, req.user.userId);
    await audit.record(req, 'request', 'grade_edit_request', row.id, null, row);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    if (err.code === 'REQUEST_EXISTS') {
      return res.status(409).json({ success: false, error: { code: err.code, message: 'There is already an open request for this mark' } });
    }
    throw err;
  }
}

async function list(req, res) {
  const { status, exam_id, class_id, teacher_id } = req.query;
  const data = await service.list(req.tenant.id, {
    status,
    exam_id,
    class_id,
    // Teachers only see their own requests; approvers see everybody's.
    teacher_id: req.user.role === 'teacher' ? req.user.userId : teacher_id,
  });
  res.json({ success: true, data });
}

async function decide(req, res) {
  const { decision, note } = req.validated.body;
  try {
    const before = await db('grade_edit_requests').where({ tenant_id: req.tenant.id, id: req.params.id }).first();
    const row = await service.decide(req.tenant.id, req.params.id, req.user.userId, req.user.role, { decision, note });
    if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
    await audit.record(req, decision === 'reject' ? 'reject' : 'approve', 'grade_edit_request', row.id, before, row);
    res.json({ success: true, data: row });
  } catch (err) {
    const messages = {
      ALREADY_DECIDED: 'This request has already been decided',
      ALREADY_APPROVED_BY_YOU: 'You already approved this request',
      INVALID_APPROVER: 'Your role cannot approve this request',
    };
    if (messages[err.code]) {
      return res.status(409).json({ success: false, error: { code: err.code, message: messages[err.code] } });
    }
    throw err;
  }
}

module.exports = { create, list, decide };
