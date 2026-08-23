const knex = require('../../config/database');
const notifService = require('../notifications/notifications.service');

async function notifyCriticalIncident(tenantId, incident) {
  if (!['critical', 'high'].includes(String(incident.severity || '').toLowerCase())) return;
  const leaders = await knex('users')
    .where({ tenant_id: tenantId, status: 'active' })
    .whereIn('role', ['general_manager', 'principal'])
    .select('id');
  for (const l of leaders) {
    await notifService.create(
      tenantId, l.id,
      `${incident.severity === 'critical' ? 'CRITICAL' : 'High-severity'} security incident`,
      incident.title,
      'error', 'security_incident', incident.id
    );
  }
}

// ---------- Visitor logs ----------
async function listVisitors(tenantId, { search, date } = {}) {
  const query = knex('visitor_logs as v')
    .leftJoin('users as u', 'v.recorded_by', 'u.id')
    .where('v.tenant_id', tenantId)
    .select(
      'v.*',
      knex.raw("CONCAT(u.first_name, ' ', u.last_name) as recorded_by_name")
    )
    .orderBy('v.time_in', 'desc')
    .limit(300);
  if (date) query.whereRaw('DATE(v.time_in) = ?', [date]);
  if (search) {
    query.where((b) => {
      b.whereILike('v.visitor_name', `%${search}%`)
        .orWhereILike('v.person_visited', `%${search}%`)
        .orWhereILike('v.badge_number', `%${search}%`);
    });
  }
  return await query;
}

async function createVisitor(tenantId, userId, data) {
  const [row] = await knex('visitor_logs')
    .insert({
      tenant_id: tenantId,
      visitor_name: data.visitor_name,
      phone: data.phone || null,
      national_id: data.national_id || null,
      person_visited: data.person_visited,
      purpose: data.purpose,
      badge_number: data.badge_number || null,
      recorded_by: userId,
    })
    .returning('*');
  return row;
}

async function checkoutVisitor(tenantId, id) {
  const [row] = await knex('visitor_logs')
    .where({ tenant_id: tenantId, id })
    .whereNull('time_out')
    .update({ time_out: knex.fn.now() })
    .returning('*');
  return row || null;
}

// ---------- Student gate passes ----------
async function listGatePasses(tenantId, { status, date } = {}) {
  const query = knex('student_gate_passes as gp')
    .join('students as st', 'gp.student_id', 'st.id')
    .join('users as su', 'st.user_id', 'su.id')
    .leftJoin('users as issuer', 'gp.issued_by', 'issuer.id')
    .leftJoin('users as verifier', 'gp.verified_by_security', 'verifier.id')
    .where('gp.tenant_id', tenantId)
    .select(
      'gp.*',
      'su.first_name as student_first_name',
      'su.last_name as student_last_name',
      'st.student_number as student_code',
      knex.raw("CONCAT(issuer.first_name, ' ', issuer.last_name) as issued_by_name"),
      knex.raw("CONCAT(verifier.first_name, ' ', verifier.last_name) as verified_by_name")
    )
    .orderBy('gp.created_at', 'desc')
    .limit(300);
  if (status && status !== 'all') query.where('gp.status', status);
  if (date) query.where('gp.departure_date', date);
  return await query;
}

async function createGatePass(tenantId, userId, data) {
  const passCode = `GP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const [row] = await knex('student_gate_passes')
    .insert({
      tenant_id: tenantId,
      student_id: data.student_id,
      issued_by: userId,
      departure_date: data.departure_date,
      departure_time: data.departure_time,
      reason: data.reason,
      authorized_pickup_person: data.authorized_pickup_person || null,
      pass_code: passCode,
    })
    .returning('*');
  return row;
}

async function verifyGatePass(tenantId, securityUserId, code) {
  const row = await knex('student_gate_passes')
    .where({ tenant_id: tenantId, pass_code: code.trim().toUpperCase(), status: 'issued' })
    .first();
  if (!row) return null;
  const [updated] = await knex('student_gate_passes')
    .where({ id: row.id })
    .update({
      status: 'verified_departed',
      verified_by_security: securityUserId,
      verified_at: knex.fn.now(),
    })
    .returning('*');
  return updated;
}

async function cancelGatePass(tenantId, id) {
  const [row] = await knex('student_gate_passes')
    .where({ tenant_id: tenantId, id, status: 'issued' })
    .update({ status: 'cancelled' })
    .returning('*');
  return row || null;
}

// ---------- Security incidents ----------
async function listIncidents(tenantId, { severity, status } = {}) {
  const query = knex('security_incidents as i')
    .leftJoin('users as u', 'i.reported_by', 'u.id')
    .where('i.tenant_id', tenantId)
    .select('i.*', knex.raw("CONCAT(u.first_name, ' ', u.last_name) as reported_by_name"))
    .orderBy('i.created_at', 'desc')
    .limit(300);
  if (severity && severity !== 'all') query.where('i.severity', severity);
  if (status && status !== 'all') query.where('i.status', status);
  return await query;
}

async function createIncident(tenantId, userId, data) {
  const [row] = await knex('security_incidents')
    .insert({
      tenant_id: tenantId,
      title: data.title,
      severity: data.severity || 'low',
      location: data.location || null,
      description: data.description,
      action_taken: data.action_taken || null,
      reported_by: userId,
    })
    .returning('*');
  try { await notifyCriticalIncident(tenantId, row); } catch (e) { console.error('notify failed', e.message); }
  return row;
}

async function updateIncident(tenantId, id, data) {
  const payload = { updated_at: knex.fn.now() };
  ['severity', 'location', 'description', 'action_taken', 'status'].forEach((f) => {
    if (data[f] !== undefined) payload[f] = data[f];
  });
  const [row] = await knex('security_incidents').where({ tenant_id: tenantId, id }).update(payload).returning('*');
  return row || null;
}

module.exports = {
  listVisitors, createVisitor, checkoutVisitor,
  listGatePasses, createGatePass, verifyGatePass, cancelGatePass,
  listIncidents, createIncident, updateIncident,
};
