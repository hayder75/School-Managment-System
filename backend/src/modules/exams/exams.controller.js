const bcrypt = require('bcrypt');
const examService = require('./exams.service');
const access = require('../../shared/access');
const audit = require('../../shared/audit');
const db = require('../../config/database');

async function teacherTeachesAny(tenantId, teacherId, subjectId, classIds) {
  const ids = [...new Set((classIds || []).filter(Boolean))];
  if (!ids.length || !subjectId) return false;
  const row = await db('teacher_subjects')
    .where({ tenant_id: tenantId, teacher_id: teacherId, subject_id: subjectId })
    .whereIn('class_id', ids)
    .first();
  return !!row;
}

async function teacherTeachesAll(tenantId, teacherId, subjectId, classIds) {
  const ids = [...new Set((classIds || []).filter(Boolean))];
  if (!ids.length || !subjectId) return false;
  const rows = await db('teacher_subjects')
    .where({ tenant_id: tenantId, teacher_id: teacherId, subject_id: subjectId })
    .whereIn('class_id', ids)
    .select('class_id');
  const set = new Set(rows.map((r) => r.class_id));
  return ids.every((id) => set.has(id));
}

function sendExamError(res, err) {
  const map = {
    PASS_EXCEEDS_TOTAL: [400, `Pass marks (${err.pass}) cannot be higher than the total (${err.total})`],
    CLASS_HAS_GRADES: [409, 'You cannot remove a class that already has marks. Remove the marks first.'],
    SUBJECT_HAS_GRADES: [409, 'You cannot change the subject of an exam that already has marks.'],
    TOTAL_BELOW_ENTERED_MARKS: [409, `The total cannot be lower than a mark already entered (highest is ${err.highest}).`],
    EXAM_TOTAL_EXCEEDS_100: [400, err.message],
    SUBJECT_REQUIRED: [400, 'A subject is required'],
  };
  const entry = map[err.code];
  if (!entry) return false;
  res.status(entry[0]).json({
    success: false,
    error: { code: err.code, message: entry[1], ...(err.class_ids ? { class_ids: err.class_ids } : {}) },
  });
  return true;
}

async function create(req, res) {
  if (req.user.role === 'teacher') {
    const { class_id, class_ids, subject_id } = req.validated.body;
    const ids = Array.isArray(class_ids) && class_ids.length ? class_ids : [class_id];
    if (!(await teacherTeachesAll(req.tenant.id, req.user.userId, subject_id, ids))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only create exams for your own classes and subjects' } });
    }
  }
  try {
    const exam = await examService.create(req.tenant.id, req.validated.body, req.user.userId);
    await audit.record(req, 'create', 'exam', exam.id, null, exam);
    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    if (sendExamError(res, err)) return;
    throw err;
  }
}

async function list(req, res) {
  const { page, limit, class_id, subject_id, type, include_archived } = req.query;
  const { userId, role } = req.user;

  if (role === 'teacher') {
    const classes = await access.teacherClassIds(req.tenant.id, userId);
    if (class_id && !classes.includes(class_id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view exams for classes you teach' } });
    }
    const result = await examService.findAllForTeacher(req.tenant.id, { page, limit, class_id, subject_id, type, include_archived, teacherId: userId });
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
    return res.json({ success: true, ...(await examService.findAllForStudentUserIds(req.tenant.id, {
      page, limit, subject_id, studentUserIds: [userId], requestedClassId: student.class_id,
    })) });
  }

  if (role === 'parent') {
    const children = await access.getChildrenUserIdsForParent(req.tenant.id, userId);
    if (children.length === 0) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No children linked to your account' } });
    }
    const result = await examService.findAllForStudentUserIds(req.tenant.id, { page, limit, subject_id, studentUserIds: children, requestedClassId: class_id });
    return res.json({ success: true, ...result });
  }

  const result = await examService.findAll(req.tenant.id, { page, limit, class_id, subject_id, type, include_archived });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const { userId, role } = req.user;
  const exam = await examService.findById(req.tenant.id, req.params.id);
  if (!exam) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });

  const ids = examService.examClassIds(exam);

  if (role === 'teacher') {
    const allowed = await teacherTeachesAny(req.tenant.id, userId, exam.subject_id, ids);
    if (!allowed) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view exams for classes you teach' } });
    }
  } else if (role === 'student') {
    const student = await access.getStudentForUser(req.tenant.id, userId);
    if (!student || !ids.includes(student.class_id)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view exams for your class' } });
    }
  } else if (role === 'parent') {
    const children = await access.getChildrenUserIdsForParent(req.tenant.id, userId);
    if (children.length === 0) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'No children linked to your account' } });
    }
    const hasChild = await db('students')
      .where({ tenant_id: req.tenant.id })
      .whereIn('class_id', ids)
      .whereIn('user_id', children)
      .first();
    if (!hasChild) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: "You can only view exams for your children's classes" } });
    }
  }

  res.json({ success: true, data: exam });
}

async function update(req, res) {
  const existing = await examService.findById(req.tenant.id, req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });

  if (req.user.role === 'teacher') {
    const existingIds = examService.examClassIds(existing);
    const subjectId = req.validated.body.subject_id || existing.subject_id;
    const nextIds = req.validated.body.class_ids?.length
      ? req.validated.body.class_ids
      : (req.validated.body.class_id ? [req.validated.body.class_id] : existingIds);
    if (!(await teacherTeachesAll(req.tenant.id, req.user.userId, subjectId, nextIds))) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update exams for your own classes and subjects' } });
    }
  }

  try {
    const exam = await examService.update(req.tenant.id, req.params.id, req.validated.body);
    if (!exam) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
    await audit.record(req, 'update', 'exam', exam.id, existing, exam);
    res.json({ success: true, data: exam });
  } catch (err) {
    if (sendExamError(res, err)) return;
    throw err;
  }
}

async function archive(req, res) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the owner can archive an exam' } });
  }
  const before = await examService.findById(req.tenant.id, req.params.id);
  if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
  const exam = await examService.archive(req.tenant.id, req.params.id, req.user.userId);
  await audit.record(req, 'archive', 'exam', exam.id, before, exam);
  res.json({ success: true, data: exam });
}

async function restore(req, res) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the owner can restore an exam' } });
  }
  const before = await examService.findById(req.tenant.id, req.params.id);
  if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });
  const exam = await examService.restore(req.tenant.id, req.params.id);
  await audit.record(req, 'restore', 'exam', exam.id, before, exam);
  res.json({ success: true, data: exam });
}

// Re-authentication for destructive actions: 5 wrong passwords per 10 min.
// The counter lives in audit_logs so it works across pm2 cluster workers.
const MAX_ATTEMPTS = 5;

async function tooManyAttempts(req) {
  const row = await db('audit_logs')
    .where({
      tenant_id: req.tenant.id,
      user_id: req.user.userId,
      action: 'delete_denied',
      entity_type: 'exam',
    })
    .where('created_at', '>=', db.raw("now() - interval '10 minutes'"))
    .count('* as c')
    .first();
  return Number(row?.c || 0) >= MAX_ATTEMPTS;
}

async function verifyPassword(req) {
  const password = String(req.body?.password || '');
  if (!password) {
    const err = new Error('PASSWORD_REQUIRED');
    err.code = 'PASSWORD_REQUIRED';
    throw err;
  }
  const user = await db('users')
    .where({ tenant_id: req.tenant.id, id: req.user.userId })
    .first();
  if (!user?.password_hash) {
    const err = new Error('PASSWORD_NOT_SET');
    err.code = 'PASSWORD_NOT_SET';
    throw err;
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const err = new Error('INVALID_PASSWORD');
    err.code = 'INVALID_PASSWORD';
    throw err;
  }
  return true;
}

async function remove(req, res) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the owner can delete an exam' } });
  }
  if (await tooManyAttempts(req)) {
    return res.status(429).json({ success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many wrong passwords. Try again in a few minutes.' } });
  }
  const before = await examService.findById(req.tenant.id, req.params.id);
  if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exam not found' } });

  try {
    await verifyPassword(req);
  } catch (err) {
    if (err.code === 'PASSWORD_REQUIRED') {
      return res.status(400).json({ success: false, error: { code: err.code, message: 'Enter your password to confirm the delete' } });
    }
    if (err.code === 'PASSWORD_NOT_SET') {
      return res.status(400).json({ success: false, error: { code: err.code, message: 'Your account has no password set. Set one in your profile first.' } });
    }
    if (err.code === 'INVALID_PASSWORD') {
      await audit.record(req, 'delete_denied', 'exam', req.params.id, null, { reason: 'invalid_password' });
      return res.status(403).json({ success: false, error: { code: err.code, message: 'Incorrect password' } });
    }
    throw err;
  }

  const force = req.query.force === 'true';
  try {
    const result = await examService.remove(req.tenant.id, req.params.id, { force });
    await audit.record(req, 'delete', 'exam', req.params.id, before, { force, result, password_verified: true });
    res.json({ success: true, data: result === undefined ? null : result });
  } catch (err) {
    if (err.code === 'EXAM_HAS_GRADES') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EXAM_HAS_GRADES',
          message: `This exam already has ${err.grades} mark(s). Archive it, or delete it permanently with force.`,
          grades: err.grades,
        },
      });
    }
    throw err;
  }
}

module.exports = { create, list, getById, update, remove, archive, restore };
