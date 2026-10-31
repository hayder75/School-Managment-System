const db = require('../../config/database');
const notif = require('../notifications/notifications.service');
const logger = require('../../config/logger');

const STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  RETURNED: 'returned',
  EDITING: 'editing',
};

const REVIEW_ROLES = ['quality_director', 'principal', 'vice_principal'];
const OVERRIDE_ROLES = ['owner', 'admin'];

function examClassIds(exam) {
  const ids = Array.isArray(exam?.class_ids) ? exam.class_ids.filter(Boolean) : [];
  if (ids.length) return ids;
  return exam?.class_id ? [exam.class_id] : [];
}

/** Which roles may approve results — configurable, defaults to QA only. */
async function reviewerRoles(tenantId) {
  try {
    const row = await db('settings').where({ tenant_id: tenantId, key: 'approvals.result_roles' }).first();
    if (!row?.value) return { roles: ['quality_director'], configured: false };
    const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    if (!Array.isArray(parsed) || !parsed.length) return { roles: ['quality_director'], configured: false };
    return { roles: parsed.map(String), configured: true };
  } catch (e) {
    return { roles: ['quality_director'], configured: false };
  }
}

async function canReview(tenantId, role) {
  if (OVERRIDE_ROLES.includes(role)) return true;
  const { roles } = await reviewerRoles(tenantId);
  return roles.includes(role);
}

async function getOrCreate(tenantId, examId, classId, { teacherId = null } = {}) {
  let row = await db('result_submissions').where({ tenant_id: tenantId, exam_id: examId, class_id: classId }).first();
  if (row) return row;
  [row] = await db('result_submissions')
    .insert({
      tenant_id: tenantId,
      exam_id: examId,
      class_id: classId,
      teacher_id: teacherId,
      status: STATUS.DRAFT,
    })
    .onConflict(['tenant_id', 'exam_id', 'class_id'])
    .merge({ updated_at: db.fn.now() })
    .returning('*');
  return row;
}

async function sectionStats(tenantId, examId, classId) {
  const students = await db('students')
    .where({ tenant_id: tenantId, class_id: classId, status: 'active' })
    .count('* as c')
    .first();
  const graded = await db('grades')
    .join('students', 'students.user_id', 'grades.student_id')
    .where({ 'grades.tenant_id': tenantId, 'grades.exam_id': examId, 'students.class_id': classId })
    .whereNotNull('grades.marks_obtained')
    .count('* as c')
    .first();
  return { total_students: Number(students?.c || 0), graded_count: Number(graded?.c || 0) };
}

async function sections(tenantId, examId, { classIds = null } = {}) {
  const exam = await db('exams').where({ tenant_id: tenantId, id: examId }).first();
  if (!exam) return [];
  const ids = classIds ? examClassIds(exam).filter((id) => classIds.includes(id)) : examClassIds(exam);
  if (!ids.length) return [];

  const classes = await db('classes').where({ tenant_id: tenantId }).whereIn('id', ids).select('id', 'name', 'section', 'grade_level');
  const subs = await db('result_submissions')
    .where({ 'result_submissions.tenant_id': tenantId, 'result_submissions.exam_id': examId })
    .whereIn('result_submissions.class_id', ids)
    .leftJoin('users as t', 'result_submissions.teacher_id', 't.id')
    .leftJoin('users as r', 'result_submissions.reviewed_by', 'r.id')
    .select(
      'result_submissions.*',
      db.raw("CONCAT_WS(' ', t.first_name, t.middle_name, t.last_name) as teacher_name"),
      db.raw("CONCAT_WS(' ', r.first_name, r.middle_name, r.last_name) as reviewer_name")
    );
  const map = new Map(subs.map((s) => [s.class_id, s]));
  const order = new Map(ids.map((id, i) => [id, i]));

  return classes
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((c) => {
      const sub = map.get(c.id);
      return {
        class_id: c.id,
        class_name: c.name,
        grade_level: c.grade_level,
        status: sub?.status || STATUS.DRAFT,
        submission_id: sub?.id || null,
        total_students: sub?.total_students ?? 0,
        graded_count: sub?.graded_count ?? 0,
        submitted_at: sub?.submitted_at || null,
        reviewed_at: sub?.reviewed_at || null,
        reviewer_name: sub?.reviewer_name || null,
        review_comment: sub?.review_comment || null,
        teacher_name: sub?.teacher_name || null,
        editable: [STATUS.DRAFT, STATUS.RETURNED, STATUS.EDITING].includes(sub?.status || STATUS.DRAFT),
      };
    });
}

async function recordSave(tenantId, examId, classId, teacherId) {
  const stats = await sectionStats(tenantId, examId, classId);
  const sub = await getOrCreate(tenantId, examId, classId, { teacherId });
  const patch = {
    ...stats,
    updated_at: db.fn.now(),
  };
  if (!sub.teacher_id && teacherId) patch.teacher_id = teacherId;
  await db('result_submissions').where({ id: sub.id }).update(patch);
  return { ...sub, ...patch };
}

async function submit(tenantId, examId, classId, userId) {
  const sub = await getOrCreate(tenantId, examId, classId, { teacherId: userId });
  if (sub.status === STATUS.SUBMITTED) return sub;
  if (sub.status === STATUS.APPROVED) {
    const err = new Error('ALREADY_APPROVED');
    err.code = 'ALREADY_APPROVED';
    throw err;
  }
  const stats = await sectionStats(tenantId, examId, classId);
  if (!stats.graded_count) {
    const err = new Error('NO_MARKS');
    err.code = 'NO_MARKS';
    throw err;
  }

  // Submitting locks the section: any edit grant is consumed.
  await db('grade_edit_requests')
    .where({ tenant_id: tenantId, exam_id: examId, class_id: classId, status: 'approved' })
    .update({ status: 'used', used_at: db.fn.now() });

  const resubmitting = [STATUS.RETURNED, STATUS.EDITING].includes(sub.status);
  const [row] = await db('result_submissions')
    .where({ id: sub.id })
    .update({
      ...stats,
      status: STATUS.SUBMITTED,
      submitted_at: db.fn.now(),
      submitted_by: userId,
      review_comment: null,
      version: resubmitting ? Number(sub.version || 1) + 1 : Number(sub.version || 1),
      updated_at: db.fn.now(),
    })
    .returning('*');

  await notifyReviewers(tenantId, row, examId, classId);
  return row;
}

async function notifyReviewers(tenantId, submission, examId, classId) {
  try {
    const { roles } = await reviewerRoles(tenantId);
    const allRoles = roles.length ? roles : ['quality_director'];
    const reviewers = await db('users')
      .where({ tenant_id: tenantId, status: 'active' })
      .whereIn('role', [...new Set([...allRoles, ...OVERRIDE_ROLES])])
      .select('id');
    const ctx = await db('exams')
      .join('subjects', 'exams.subject_id', 'subjects.id')
      .leftJoin('classes', 'classes.id', db.raw('?', [classId]))
      .where('exams.id', examId)
      .select('exams.name as exam_name', 'subjects.name as subject_name', 'classes.name as class_name')
      .first();
    for (const r of reviewers) {
      await notif.create(
        tenantId,
        r.id,
        'Results awaiting approval',
        `${ctx?.exam_name || 'Exam'} · ${ctx?.class_name || 'Class'} · ${ctx?.subject_name || ''} was submitted for approval.`,
        'info',
        'result_submission',
        submission.id
      );
    }
  } catch (err) {
    logger.error('notify reviewers failed', { error: err.message });
  }
}

async function review(tenantId, submissionId, userId, { decision, comment }) {
  const sub = await db('result_submissions').where({ tenant_id: tenantId, id: submissionId }).first();
  if (!sub) return null;
  if (![STATUS.SUBMITTED, STATUS.APPROVED].includes(sub.status)) {
    const err = new Error('NOT_SUBMITTED');
    err.code = 'NOT_SUBMITTED';
    throw err;
  }
  if (decision !== 'approve' && !comment) {
    const err = new Error('COMMENT_REQUIRED');
    err.code = 'COMMENT_REQUIRED';
    throw err;
  }

  const approve = decision === 'approve';
  const [row] = await db('result_submissions')
    .where({ id: submissionId })
    .update({
      status: approve ? STATUS.APPROVED : STATUS.RETURNED,
      reviewed_at: db.fn.now(),
      reviewed_by: userId,
      review_comment: comment || null,
      updated_at: db.fn.now(),
    })
    .returning('*');

  await db('result_review_comments').insert({
    tenant_id: tenantId,
    submission_id: submissionId,
    user_id: userId,
    action: approve ? 'approved' : 'returned',
    comment: comment || null,
  });

  try {
    if (row.teacher_id) {
      await notif.create(
        tenantId,
        row.teacher_id,
        approve ? 'Results approved' : 'Results sent back',
        approve
          ? 'Your results were approved by quality assurance.'
          : `Your results were sent back: ${comment}`,
        approve ? 'success' : 'warning',
        'result_submission',
        row.id
      );
    }
  } catch (err) {
    logger.error('notify teacher failed', { error: err.message });
  }

  return row;
}

async function list(tenantId, { status, exam_id, class_id, teacher_id, subject_id, type, class_ids, subject_ids, teacher_self } = {}) {
  const query = db('result_submissions as rs')
    .where('rs.tenant_id', tenantId)
    .join('exams as ex', 'rs.exam_id', 'ex.id')
    .join('classes as c', 'rs.class_id', 'c.id')
    .leftJoin('subjects as s', 'rs.subject_id', 's.id')
    .leftJoin('users as t', 'rs.teacher_id', 't.id')
    .leftJoin('users as r', 'rs.reviewed_by', 'r.id')
    .select(
      'rs.*',
      'ex.name as exam_name',
      'ex.type as exam_type',
      'ex.date as exam_date',
      'ex.total_marks',
      'ex.pass_marks',
      'c.name as class_name',
      's.name as subject_name',
      db.raw("CONCAT_WS(' ', t.first_name, t.middle_name, t.last_name) as teacher_name"),
      db.raw("CONCAT_WS(' ', r.first_name, r.middle_name, r.last_name) as reviewer_name")
    )
    .orderBy('rs.updated_at', 'desc');

  if (status && status !== 'all') {
    if (status === 'pending') query.whereIn('rs.status', [STATUS.SUBMITTED]);
    else query.where('rs.status', status);
  }
  if (exam_id) query.where('rs.exam_id', exam_id);
  if (class_id) query.where('rs.class_id', class_id);
  if (Array.isArray(class_ids)) {
    if (class_ids.length) query.whereIn('rs.class_id', class_ids);
    else query.whereRaw('false');
  }
  if (teacher_id) query.where('rs.teacher_id', teacher_id);
  if (Array.isArray(subject_ids)) {
    if (subject_ids.length) query.whereIn('rs.subject_id', subject_ids);
    else query.whereRaw('false');
  }
  if (teacher_self) {
    query.where(function () { this.where('rs.teacher_id', teacher_self).orWhereNull('rs.teacher_id'); });
  }
  if (subject_id) query.where('rs.subject_id', subject_id);
  if (type) query.where('ex.type', type);

  return query.limit(500);
}

async function summary(tenantId) {
  const rows = await db('result_submissions')
    .where({ tenant_id: tenantId })
    .groupBy('status')
    .select('status')
    .count('* as c');
  const counts = { draft: 0, submitted: 0, approved: 0, returned: 0, editing: 0 };
  for (const r of rows) counts[r.status] = Number(r.c);

  const reviewsToday = await db('result_submissions')
    .where({ tenant_id: tenantId })
    .whereNotNull('reviewed_at')
    .whereRaw('reviewed_at::date = CURRENT_DATE')
    .count('* as c')
    .first();

  let approvalRate = 0;
  const decided = counts.approved + counts.returned;
  if (decided > 0) approvalRate = Math.round((counts.approved / decided) * 100);

  return { counts, pending: counts.submitted, reviewed_today: Number(reviewsToday?.c || 0), approval_rate: approvalRate };
}

async function detail(tenantId, submissionId) {
  const sub = await list(tenantId, { status: 'all' });
  const row = sub.find((s) => s.id === submissionId);
  if (!row) return null;

  const students = await db('students as st')
    .join('users as u', 'st.user_id', 'u.id')
    .where('st.tenant_id', tenantId)
    .where('st.class_id', row.class_id)
    .where('st.status', 'active')
    .leftJoin('grades as g', function () {
      this.on('g.student_id', '=', 'u.id').andOn('g.exam_id', '=', db.raw('?', [row.exam_id]));
    })
    .select(
      'u.id as student_id',
      'u.first_name',
      'u.middle_name',
      'u.last_name',
      'st.student_number',
      'g.id as grade_id',
      'g.marks_obtained',
      'g.grade_letter',
      'g.updated_by',
      'g.updated_at'
    )
    .orderBy('u.first_name');

  const history = await db('grade_history as h')
    .leftJoin('users as u', 'h.student_id', 'u.id')
    .where({ 'h.tenant_id': tenantId, 'h.exam_id': row.exam_id })
    .select(
      'h.*',
      db.raw("CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) as student_name")
    )
    .orderBy('h.created_at', 'desc')
    .limit(200);

  const comments = await db('result_review_comments as rc')
    .leftJoin('users as u', 'rc.user_id', 'u.id')
    .where({ 'rc.tenant_id': tenantId, 'rc.submission_id': submissionId })
    .select(
      'rc.*',
      db.raw("CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) as author_name"),
      'u.role as author_role'
    )
    .orderBy('rc.created_at', 'asc');

  const total = row.total_marks != null ? Number(row.total_marks) : null;
  const pass = row.pass_marks != null ? Number(row.pass_marks) : null;
  let exceeded = 0;
  let belowPass = 0;
  let missing = 0;
  for (const s of students) {
    if (s.marks_obtained == null) { missing += 1; continue; }
    const m = Number(s.marks_obtained);
    if (total != null && m > total) exceeded += 1;
    if (pass != null && m < pass) belowPass += 1;
  }

  return {
    submission: row,
    students,
    history,
    comments,
    warnings: {
      missing,
      exceeded,
      below_pass: belowPass,
      total_students: students.length,
      fail_rate: students.length ? Math.round((belowPass / students.length) * 100) : 0,
    },
  };
}

async function addComment(tenantId, userId, submissionId, comment, action = 'comment') {
  const [row] = await db('result_review_comments')
    .insert({ tenant_id: tenantId, submission_id: submissionId, user_id: userId, comment, action })
    .returning('*');
  return row;
}

async function statusFor(tenantId, examId, classId) {
  const row = await db('result_submissions').where({ tenant_id: tenantId, exam_id: examId, class_id: classId }).first();
  return row?.status || STATUS.DRAFT;
}

module.exports = {
  STATUS, REVIEW_ROLES, OVERRIDE_ROLES,
  reviewerRoles, canReview,
  getOrCreate, sections, recordSave, submit, review, list, summary, detail,
  addComment, statusFor, sectionStats,
};
