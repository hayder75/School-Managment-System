const db = require('../../config/database');
const notif = require('../notifications/notifications.service');
const logger = require('../../config/logger');

const OWNER_ROLES = ['owner', 'admin'];
const QA_ROLES = ['quality_director', 'principal', 'vice_principal', 'general_manager'];
const GRANT_HOURS = 48;

function isOwnerRole(role) {
  return OWNER_ROLES.includes(role);
}
function isQaRole(role) {
  return QA_ROLES.includes(role);
}

async function expireStale(tenantId) {
  // Older requests needed both signatures; a single approval is now enough,
  // so promote anything that already has one.
  await db('grade_edit_requests')
    .where({ tenant_id: tenantId, status: 'partially_approved' })
    .update({
      status: 'approved',
      expires_at: db.raw("COALESCE(expires_at, now() + interval '48 hours')"),
      updated_at: db.fn.now(),
    });

  await db('grade_edit_requests')
    .where({ tenant_id: tenantId, status: 'approved' })
    .whereNotNull('expires_at')
    .where('expires_at', '<', db.fn.now())
    .update({ status: 'expired', updated_at: db.fn.now() });
}

async function create(tenantId, data, userId) {
  await expireStale(tenantId);

  const existing = await db('grade_edit_requests')
    .where({
      tenant_id: tenantId,
      exam_id: data.exam_id,
      class_id: data.class_id,
      status: 'pending',
    })
    .modify((q) => {
      if (data.student_id) q.where({ student_id: data.student_id });
      else q.whereNull('student_id');
    })
    .first();
  if (existing) {
    const err = new Error('REQUEST_EXISTS');
    err.code = 'REQUEST_EXISTS';
    throw err;
  }

  const [row] = await db('grade_edit_requests')
    .insert({
      tenant_id: tenantId,
      exam_id: data.exam_id,
      class_id: data.class_id,
      student_id: data.student_id || null,
      requested_by: userId,
      scope: data.student_id ? 'student' : 'section',
      reason: data.reason,
      status: 'pending',
    })
    .returning('*');

  await notifyCreation(tenantId, row);
  return row;
}

async function notifyCreation(tenantId, request) {
  try {
    const ctx = await context(tenantId, request);
    const recipients = await db('users')
      .where({ tenant_id: tenantId, status: 'active' })
      .whereIn('role', [...OWNER_ROLES, ...QA_ROLES])
      .select('id');
    for (const u of recipients) {
      await notif.create(
        tenantId,
        u.id,
        'Mark edit request',
        `${ctx.teacher_name || 'A teacher'} asked to edit a mark: ${ctx.exam_name} · ${ctx.class_name}. Reason: ${request.reason}`,
        'warning',
        'grade_edit_request',
        request.id
      );
    }
  } catch (err) {
    logger.error('edit request notify failed', { error: err.message });
  }
}

async function context(tenantId, request) {
  const row = await db('grade_edit_requests as r')
    .join('exams as ex', 'r.exam_id', 'ex.id')
    .join('classes as c', 'r.class_id', 'c.id')
    .join('users as t', 'r.requested_by', 't.id')
    .where({ 'r.tenant_id': tenantId, 'r.id': request.id })
    .select(
      'ex.name as exam_name',
      'c.name as class_name',
      db.raw("CONCAT_WS(' ', t.first_name, t.middle_name, t.last_name) as teacher_name")
    )
    .first();
  return row || {};
}

async function list(tenantId, { status, exam_id, class_id, teacher_id } = {}) {
  await expireStale(tenantId);
  const query = db('grade_edit_requests as r')
    .where('r.tenant_id', tenantId)
    .join('exams as ex', 'r.exam_id', 'ex.id')
    .join('classes as c', 'r.class_id', 'c.id')
    .join('users as t', 'r.requested_by', 't.id')
    .leftJoin('users as st', 'r.student_id', 'st.id')
    .leftJoin('users as oa', 'r.owner_approved_by', 'oa.id')
    .leftJoin('users as qa', 'r.qa_approved_by', 'qa.id')
    .select(
      'r.*',
      'ex.name as exam_name',
      'ex.type as exam_type',
      'c.name as class_name',
      db.raw("CONCAT_WS(' ', t.first_name, t.middle_name, t.last_name) as teacher_name"),
      db.raw("CONCAT_WS(' ', st.first_name, st.middle_name, st.last_name) as student_name"),
      db.raw("CONCAT_WS(' ', oa.first_name, oa.middle_name, oa.last_name) as owner_approver_name"),
      db.raw("CONCAT_WS(' ', qa.first_name, qa.middle_name, qa.last_name) as qa_approver_name")
    )
    .orderBy('r.created_at', 'desc');

  if (status && status !== 'all') {
    if (status === 'pending') query.whereIn('r.status', ['pending', 'partially_approved']);
    else query.where('r.status', status);
  }
  if (exam_id) query.where('r.exam_id', exam_id);
  if (class_id) query.where('r.class_id', class_id);
  if (teacher_id) query.where('r.requested_by', teacher_id);
  return query.limit(300);
}

async function decide(tenantId, id, userId, role, { decision, note }) {
  await expireStale(tenantId);
  const request = await db('grade_edit_requests').where({ tenant_id: tenantId, id }).first();
  if (!request) return null;
  if (['approved', 'rejected', 'expired', 'used'].includes(request.status)) {
    const err = new Error('ALREADY_DECIDED');
    err.code = 'ALREADY_DECIDED';
    throw err;
  }

  if (decision === 'reject') {
    const [row] = await db('grade_edit_requests')
      .where({ id })
      .update({
        status: 'rejected',
        rejected_by: userId,
        rejected_at: db.fn.now(),
        reject_note: note || null,
        updated_at: db.fn.now(),
      })
      .returning('*');
    await notifyTeacher(tenantId, row, 'rejected', note);
    return row;
  }

  const patch = { updated_at: db.fn.now() };
  if (isOwnerRole(role) && !request.owner_approved_by) {
    patch.owner_approved_by = userId;
    patch.owner_approved_at = db.fn.now();
    patch.owner_note = note || null;
  } else if (isQaRole(role) && !request.qa_approved_by) {
    patch.qa_approved_by = userId;
    patch.qa_approved_at = db.fn.now();
    patch.qa_note = note || null;
  } else if (isOwnerRole(role) && request.owner_approved_by) {
    const err = new Error('ALREADY_APPROVED_BY_YOU');
    err.code = 'ALREADY_APPROVED_BY_YOU';
    throw err;
  } else if (isQaRole(role) && request.qa_approved_by) {
    const err = new Error('ALREADY_APPROVED_BY_YOU');
    err.code = 'ALREADY_APPROVED_BY_YOU';
    throw err;
  } else {
    const err = new Error('INVALID_APPROVER');
    err.code = 'INVALID_APPROVER';
    throw err;
  }

  // Either the owner/admin or quality assurance can authorise the correction.
  // One approval is enough — both sides already have authority over marks.
  patch.status = 'approved';
  patch.expires_at = new Date(Date.now() + GRANT_HOURS * 3600 * 1000);

  const [row] = await db('grade_edit_requests').where({ id }).update(patch).returning('*');

  // Reopen the section so the teacher can change the mark.
  await db('result_submissions')
    .where({ tenant_id: tenantId, exam_id: row.exam_id, class_id: row.class_id })
    .whereIn('status', ['submitted', 'approved'])
    .update({ status: 'editing', updated_at: db.fn.now() });
  await notifyTeacher(tenantId, row, 'approved', note);
  return row;
}

async function notifyTeacher(tenantId, request, outcome, note) {
  try {
    const ctx = await context(tenantId, request);
    if (!request.requested_by) return;
    await notif.create(
      tenantId,
      request.requested_by,
      outcome === 'approved' ? 'Edit request approved' : 'Edit request rejected',
      outcome === 'approved'
        ? `You can now correct the mark for ${ctx.exam_name} · ${ctx.class_name} for ${GRANT_HOURS} hours. Submit again when done.`
        : `Your edit request was rejected${note ? `: ${note}` : ''}.`,
      outcome === 'approved' ? 'success' : 'warning',
      'grade_edit_request',
      request.id
    );
  } catch (err) {
    logger.error('notify teacher edit decision failed', { error: err.message });
  }
}

async function notifyOtherApprover(tenantId, request, role) {
  try {
    const ctx = await context(tenantId, request);
    const targetRoles = isOwnerRole(role) ? QA_ROLES : OWNER_ROLES;
    const recipients = await db('users')
      .where({ tenant_id: tenantId, status: 'active' })
      .whereIn('role', targetRoles)
      .select('id');
    for (const u of recipients) {
      await notif.create(
        tenantId,
        u.id,
        'Edit request needs your approval',
        `${ctx.teacher_name || 'A teacher'} · ${ctx.exam_name} · ${ctx.class_name} — the other approver has signed off.`,
        'info',
        'grade_edit_request',
        request.id
      );
    }
  } catch (err) {
    logger.error('notify other approver failed', { error: err.message });
  }
}

/** Is the teacher allowed to edit this student's mark right now? */
async function activeGrant(tenantId, examId, classId, studentId, teacherId) {
  await expireStale(tenantId);
  const row = await db('grade_edit_requests')
    .where({
      tenant_id: tenantId,
      exam_id: examId,
      class_id: classId,
      requested_by: teacherId,
      status: 'approved',
    })
    .andWhere(function () {
      this.where('student_id', studentId).orWhereNull('student_id');
    })
    .where(function () {
      this.whereNull('expires_at').orWhere('expires_at', '>', db.fn.now());
    })
    .orderBy('created_at', 'desc')
    .first();
  return row || null;
}

async function pendingFor(tenantId, examId, classId, teacherId) {
  await expireStale(tenantId);
  return db('grade_edit_requests')
    .where({ tenant_id: tenantId, exam_id: examId, class_id: classId, requested_by: teacherId })
    .whereIn('status', ['pending', 'partially_approved', 'approved'])
    .orderBy('created_at', 'desc');
}

module.exports = { create, list, decide, activeGrant, pendingFor, expireStale, OWNER_ROLES, QA_ROLES };
