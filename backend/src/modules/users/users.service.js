const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

const userFields = [
  'id', 'tenant_id', 'email', 'first_name', 'last_name',
  'phone', 'avatar', 'role', 'status', 'last_login', 'created_at', 'updated_at',
];

async function create(tenantId, data) {
  const [user] = await db('users')
    .insert({
      tenant_id: tenantId,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone || null,
      role: data.role,
      status: 'invited',
    })
    .returning(userFields);

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
