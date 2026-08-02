const db = require('../../config/database');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { paginatedResult } = require('../../shared/pagination');
const { sendInviteEmail } = require('../../shared/email');
const logger = require('../../config/logger');

const userFields = [
  'id', 'tenant_id', 'email', 'username', 'first_name', 'last_name',
  'phone', 'avatar', 'role', 'status', 'last_login', 'created_at', 'updated_at',
  'job_title', 'qualification', 'field_of_study', 'gender',
  'section_count', 'periods_per_week', 'overtime_periods', 'total_periods',
];

async function create(tenantId, data) {
  const [user] = await db('users')
    .insert({
      tenant_id: tenantId,
      email: data.email,
      username: data.username || null,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || null,
      role: data.role,
      status: 'invited',
      job_title: data.job_title || null,
      qualification: data.qualification || null,
      field_of_study: data.field_of_study || null,
      gender: data.gender || null,
      section_count: data.section_count ?? null,
      periods_per_week: data.periods_per_week ?? null,
      overtime_periods: data.overtime_periods ?? 0,
      total_periods: data.total_periods ?? ((data.periods_per_week ?? 0) + (data.overtime_periods ?? 0)),
    })
    .returning(userFields);

  if (data.send_invite !== false) {
    const token = jwt.sign(
      { userId: user.id, type: 'invitation', email: user.email },
      config.jwt.secret,
      { expiresIn: '7d' }
    );
    user.invitation_token = token;

    const inviteLink = `${config.frontendUrl}/auth/set-password?token=${token}`;
    const tenant = await db('tenants').where({ id: tenantId }).select('name').first();
    const schoolName = tenant?.name || 'School';
    const sent = await sendInviteEmail(user.email, inviteLink, schoolName);
    if (!sent) {
      logger.info(`Invite email not delivered to ${user.email}; set-password link: ${inviteLink}`);
    }
  }

  return user;
}

async function findAll(tenantId, { page = 1, limit = 20, role, status, search } = {}) {
  let query = db('users')
    .where({ tenant_id: tenantId })
    .select(userFields)
    .orderBy('created_at', 'desc');

  if (role) query = query.where({ role });
  if (status) query = query.where({ status });
  if (search) {
    query = query.where(function () {
      this.where('first_name', 'ilike', `%${search}%`)
        .orWhere('last_name', 'ilike', `%${search}%`)
        .orWhere('email', 'ilike', `%${search}%`);
    });
  }

  return paginatedResult(query, page, limit);
}

async function findById(tenantId, id) {
  return db('users')
    .where({ tenant_id: tenantId, id })
    .select(userFields)
    .first();
}

async function update(tenantId, id, data) {
  if (data.total_periods == null && (data.periods_per_week != null || data.overtime_periods != null)) {
    const current = await db('users').where({ tenant_id: tenantId, id }).first();
    const ppw = data.periods_per_week ?? current?.periods_per_week ?? 0;
    const ot = data.overtime_periods ?? current?.overtime_periods ?? 0;
    data.total_periods = ppw + ot;
  }
  data.updated_at = db.fn.now();
  const [user] = await db('users')
    .where({ tenant_id: tenantId, id })
    .update(data)
    .returning(userFields);
  return user;
}

async function remove(tenantId, id) {
  return db('users').where({ tenant_id: tenantId, id }).del();
}

module.exports = { create, findAll, findById, update, remove };
