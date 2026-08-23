const knex = require('../../config/database');
const notifService = require('../notifications/notifications.service');

async function notifyReviewers(tenantId, submission) {
  const reviewers = await knex('users')
    .where({ tenant_id: tenantId, status: 'active' })
    .whereIn('role', ['quality_director', 'principal', 'vice_principal'])
    .select('id');
  for (const r of reviewers) {
    await notifService.create(
      tenantId, r.id,
      'Content awaiting review',
      `"${submission.title}" was submitted for review.`,
      'info', 'content_submission', submission.id
    );
  }
}

async function notifyTeacherDecision(tenantId, submission) {
  if (!submission.teacher_id || !submission.review_comment) return;
  const verdict = submission.status === 'approved' ? 'APPROVED ✓' : 'CHANGES REQUESTED';
  await notifService.create(
    tenantId, submission.teacher_id,
    `Submission ${verdict}`,
    `"${submission.title}": ${submission.review_comment}`,
    submission.status === 'approved' ? 'success' : 'warning',
    'content_submission', submission.id
  );
}

const TEACHER_SELECT = [
  'cs.*',
  knex.raw("CONCAT(u.first_name, ' ', u.last_name) as teacher_name"),
  'u.email as teacher_email',
  'c.name as class_name',
  's.name as subject_name',
  knex.raw("CONCAT(r.first_name, ' ', r.last_name) as reviewer_name"),
];

function baseQuery(tenantId) {
  return knex('content_submissions as cs')
    .join('users as u', 'cs.teacher_id', 'u.id')
    .leftJoin('classes as c', 'cs.class_id', 'c.id')
    .leftJoin('subjects as s', 'cs.subject_id', 's.id')
    .leftJoin('users as r', 'cs.reviewed_by', 'r.id')
    .where('cs.tenant_id', tenantId);
}

async function list(tenantId, { status, type, teacherId, bank } = {}) {
  const query = baseQuery(tenantId).select(TEACHER_SELECT);

  if (status && status !== 'all') {
    if (status === 'pending') {
      query.whereIn('cs.status', ['submitted', 'needs_revision']);
    } else {
      query.where('cs.status', status);
    }
  }
  if (type && type !== 'all') query.where('cs.type', type);
  if (teacherId) query.where('cs.teacher_id', teacherId);
  if (bank) {
    query.where('cs.status', 'approved').where('cs.is_banked', true);
  }

  return await query.orderBy('cs.updated_at', 'desc').limit(500);
}

async function getById(tenantId, id) {
  const [row] = await baseQuery(tenantId).select(TEACHER_SELECT).where('cs.id', id);
  return row || null;
}

async function listComments(tenantId, submissionId) {
  return await knex('submission_comments as sc')
    .join('users as u', 'sc.user_id', 'u.id')
    .where({ 'sc.tenant_id': tenantId, 'sc.submission_id': submissionId })
    .select('sc.*', knex.raw("CONCAT(u.first_name, ' ', u.last_name) as author_name"), 'u.role as author_role')
    .orderBy('sc.created_at', 'asc');
}

async function addComment(tenantId, userId, submissionId, comment) {
  const [row] = await knex('submission_comments')
    .insert({ tenant_id: tenantId, user_id: userId, submission_id: submissionId, comment })
    .returning('*');
  return row;
}

async function create(tenantId, teacherId, data) {
  const payload = {
    tenant_id: tenantId,
    teacher_id: teacherId,
    type: data.type,
    title: data.title,
    class_id: data.class_id || null,
    subject_id: data.subject_id || null,
    week_number: data.week_number ? Number(data.week_number) : null,
    body: data.body || null,
    attachment_url: data.attachment_url || null,
    answer_key_url: data.answer_key_url || null,
    status: data.submit === true || data.status === 'submitted' ? 'submitted' : 'draft',
    submitted_at: data.submit === true || data.status === 'submitted' ? knex.fn.now() : null,
  };
  const [row] = await knex('content_submissions').insert(payload).returning('*');
  if (row.status === 'submitted') {
    try { await notifyReviewers(tenantId, row); } catch (e) { console.error('notify failed', e.message); }
  }
  return row;
}

async function updateOwn(tenantId, teacherId, id, data) {
  const [existing] = await knex('content_submissions')
    .where({ tenant_id: tenantId, id, teacher_id: teacherId })
    .first();
  if (!existing) return null;

  const resubmitting = data.submit === true;
  const payload = {
    title: data.title ?? existing.title,
    type: data.type ?? existing.type,
    class_id: data.class_id ?? existing.class_id,
    subject_id: data.subject_id ?? existing.subject_id,
    body: data.body ?? existing.body,
    attachment_url: data.attachment_url ?? existing.attachment_url,
    answer_key_url: data.answer_key_url ?? existing.answer_key_url,
    updated_at: knex.fn.now(),
  };
  if (resubmitting) {
    payload.status = 'submitted';
    payload.submitted_at = knex.fn.now();
    payload.review_comment = null;
    payload.reviewed_by = null;
    payload.reviewed_at = null;
    payload.rubric_scores = '{}';
  }
  const [row] = await knex('content_submissions').where({ id }).update(payload).returning('*');
  if (row && row.status === 'submitted') {
    try { await notifyReviewers(tenantId, row); } catch (e) { console.error('notify failed', e.message); }
  }
  return row;
}

async function removeOwn(tenantId, teacherId, id) {
  const count = await knex('content_submissions')
    .where({ tenant_id: tenantId, id, teacher_id: teacherId })
    .whereIn('status', ['draft', 'needs_revision'])
    .del();
  return count > 0;
}

async function review(tenantId, reviewerId, id, { decision, comment, rubric_scores, bank }) {
  const existing = await knex('content_submissions')
    .where({ tenant_id: tenantId, id })
    .first();
  if (!existing) return null;

  const statusMap = { approve: 'approved', request_changes: 'needs_revision', reject: 'rejected' };
  const newStatus = statusMap[decision];
  if (!newStatus) throw Object.assign(new Error('INVALID_DECISION'), { code: 'INVALID_DECISION' });
  if (decision !== 'approve' && !comment) {
    throw Object.assign(new Error('COMMENT_REQUIRED'), { code: 'COMMENT_REQUIRED' });
  }
  if (['draft', 'archived'].includes(existing.status)) {
    throw Object.assign(new Error('NOT_SUBMITTED'), { code: 'NOT_SUBMITTED' });
  }

  const payload = {
    status: newStatus,
    review_comment: comment || null,
    reviewed_by: reviewerId,
    reviewed_at: knex.fn.now(),
    rubric_scores: rubric_scores ? JSON.stringify(rubric_scores) : existing.rubric_scores,
    is_banked: decision === 'approve' && (bank === true || existing.is_banked === true),
    updated_at: knex.fn.now(),
  };
  const [row] = await knex('content_submissions').where({ id }).update(payload).returning('*');
  if (row) {
    try { await notifyTeacherDecision(tenantId, row); } catch (e) { console.error('notify failed', e.message); }
  }
  return row;
}

async function toggleBank(tenantId, id, banked) {
  const [row] = await knex('content_submissions')
    .where({ tenant_id: tenantId, id, status: 'approved' })
    .update({ is_banked: !!banked, updated_at: knex.fn.now() })
    .returning('*');
  return row || null;
}

async function summary(tenantId) {
  const [counts] = await knex('content_submissions')
    .where('tenant_id', tenantId)
    .select(
      knex.raw("COUNT(*) FILTER (WHERE status = 'submitted')::int as pending_review"),
      knex.raw("COUNT(*) FILTER (WHERE status = 'needs_revision')::int as needs_revision"),
      knex.raw("COUNT(*) FILTER (WHERE status = 'approved')::int as approved"),
      knex.raw("COUNT(*) FILTER (WHERE status = 'draft')::int as drafts"),
      knex.raw("COALESCE(AVG((rubric_scores->>'alignment')::numeric), 0)::numeric(3,2) as avg_alignment"),
      knex.raw("COALESCE(AVG((rubric_scores->>'difficulty')::numeric), 0)::numeric(3,2) as avg_difficulty"),
      knex.raw("COALESCE(AVG((rubric_scores->>'clarity')::numeric), 0)::numeric(3,2) as avg_clarity"),
      knex.raw("COALESCE(AVG((rubric_scores->>'answer_key')::numeric), 0)::numeric(3,2) as avg_answer_key")
    );

  const byType = await knex('content_submissions')
    .where('tenant_id', tenantId)
    .select('type')
    .count('* as count')
    .groupBy('type');

  const byTeacher = await knex('content_submissions as cs')
    .join('users as u', 'cs.teacher_id', 'u.id')
    .where('cs.tenant_id', tenantId)
    .select(
      'cs.teacher_id',
      knex.raw("CONCAT(u.first_name, ' ', u.last_name) as teacher_name"),
      knex.raw('COUNT(*)::int as total'),
      knex.raw("COUNT(*) FILTER (WHERE cs.status = 'approved')::int as approved")
    )
    .groupBy('cs.teacher_id', 'u.first_name', 'u.last_name')
    .orderBy('total', 'desc')
    .limit(10);

  return { counts, byType, byTeacher };
}

module.exports = {
  list,
  getById,
  listComments,
  addComment,
  create,
  updateOwn,
  removeOwn,
  review,
  toggleBank,
  summary,
};
