const knex = require('../../config/database');
const broadcast = require('../../socket/broadcast');
const logger = require('../../config/logger');

const MANAGER_ROLES = ['owner', 'admin', 'general_manager', 'principal', 'vice_principal', 'quality_director'];

async function list(tenantId, role, userId, { status, studentId } = {}) {
  const query = knex('student_discipline as d')
    .join('students as s', 'd.student_id', 's.id')
    .join('users as su', 's.user_id', 'su.id')
    .leftJoin('users as rec', 'd.recorded_by', 'rec.id')
    .leftJoin('users as res', 'd.resolved_by', 'res.id')
    .where('d.tenant_id', tenantId)
    .select(
      'd.*',
      'su.first_name as student_first_name',
      'su.last_name as student_last_name',
      's.student_number as student_code',
      's.class_id',
      'su.id as student_user_id',
      knex.raw("CONCAT_WS(' ', rec.first_name, rec.middle_name, rec.last_name) as recorded_by_name"),
      knex.raw("CONCAT_WS(' ', res.first_name, res.middle_name, res.last_name) as resolved_by_name")
    )
    .orderBy('d.created_at', 'desc')
    .limit(300);

  if (role === 'parent') {
    // Parents only see discipline cases for their own children.
    query.whereIn('d.student_id', function () {
      this.select('student_id').from('student_parents').where({ parent_id: userId, tenant_id: tenantId });
    });
  } else if (role === 'teacher') {
    // Teachers see cases for students in classes they teach.
    query.whereIn('s.class_id', function () {
      this.select('class_id').from('teacher_subjects').where({ teacher_id: userId, tenant_id: tenantId });
    });
  }

  if (status && status !== 'all') query.where('d.status', status);
  if (studentId) query.where('d.student_id', studentId);
  return await query;
}

async function canAccessStudent(tenantId, userId, role, studentId) {
  const student = await knex('students')
    .where({ tenant_id: tenantId, id: studentId })
    .first();
  if (!student) return false;

  if (MANAGER_ROLES.includes(role)) return true;

  if (role === 'teacher') {
    const assigned = await knex('teacher_subjects')
      .where({ tenant_id: tenantId, teacher_id: userId, class_id: student.class_id })
      .first();
    return !!assigned;
  }

  if (role === 'parent') {
    const link = await knex('student_parents')
      .where({ tenant_id: tenantId, parent_id: userId, student_id: studentId })
      .first();
    return !!link;
  }

  return false;
}

async function create(tenantId, userId, role, data) {
  const allowed = await canAccessStudent(tenantId, userId, role, data.student_id);
  if (!allowed) {
    const err = new Error('You can only record discipline for students in your own class.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const [row] = await knex('student_discipline')
    .insert({
      tenant_id: tenantId,
      student_id: data.student_id,
      incident_type: data.incident_type || 'other',
      description: data.description,
      sanction: data.sanction || null,
      hearing_date: data.hearing_date || null,
      parent_notified: !!data.parent_notified,
      recorded_by: userId,
    })
    .returning('*');

  if (data.parent_notified) {
    await notifyParentsOfDiscipline(tenantId, row, 'created');
  }

  return row;
}

async function resolve(tenantId, userId, id, { outcome, sanction, parent_notified }) {
  const [row] = await knex('student_discipline')
    .where({ tenant_id: tenantId, id })
    .whereNotIn('status', ['resolved', 'closed'])
    .update({
      status: 'resolved',
      outcome: outcome || null,
      sanction: sanction || null,
      parent_notified: !!parent_notified,
      resolved_by: userId,
      resolved_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .returning('*');
  if (row && parent_notified) {
    await notifyParentsOfDiscipline(tenantId, row, 'resolved');
  }
  return row || null;
}

async function notifyParentsOfDiscipline(tenantId, record, action) {
  try {
    const student = await knex('students')
      .join('users', 'students.user_id', 'users.id')
      .where({ 'students.tenant_id': tenantId, 'students.id': record.student_id })
      .select('users.first_name', 'users.last_name', 'students.class_id')
      .first();
    const parents = await knex('student_parents')
      .where({ tenant_id: tenantId, student_id: record.student_id })
      .select('parent_id');
    if (!parents.length) return;

    const studentName = [student?.first_name, student?.last_name].filter(Boolean).join(' ');
    const incident = record.incident_type || 'discipline';
    const title = action === 'resolved' ? 'Discipline case resolved' : 'Discipline case recorded';
    const message = action === 'resolved'
      ? `The discipline case recorded against ${studentName} has been resolved.`
      : `${studentName} was reported for: ${incident}. ${record.description || ''}`.trim();

    await broadcast.notifyUsers(tenantId, parents.map((p) => p.parent_id), {
      title,
      message,
      type: 'discipline',
      refType: 'discipline',
      refId: record.id,
    });
  } catch (err) {
    logger.error('Discipline notification error', { error: err.message });
  }
}

module.exports = { list, create, resolve, canAccessStudent };