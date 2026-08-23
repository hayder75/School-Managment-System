const knex = require('../../config/database');

async function list(tenantId, { status, studentId } = {}) {
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
      knex.raw("CONCAT(rec.first_name, ' ', rec.last_name) as recorded_by_name"),
      knex.raw("CONCAT(res.first_name, ' ', res.last_name) as resolved_by_name")
    )
    .orderBy('d.created_at', 'desc')
    .limit(300);
  if (status && status !== 'all') query.where('d.status', status);
  if (studentId) query.where('d.student_id', studentId);
  return await query;
}

async function create(tenantId, userId, data) {
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
  return row || null;
}

module.exports = { list, create, resolve };
