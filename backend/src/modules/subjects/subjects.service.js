const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, data) {
  const [subject] = await db('subjects').insert({ ...data, tenant_id: tenantId }).returning('*');
  return subject;
}

async function findAll(tenantId, { page = 1, limit = 20, is_active } = {}) {
  let query = db('subjects')
    .where({ tenant_id: tenantId })
    .orderBy('name', 'asc');

  if (is_active !== undefined) query = query.where({ is_active });

  return paginatedResult(query, page, limit);
}

async function findById(tenantId, id) {
  return db('subjects').where({ tenant_id: tenantId, id }).first();
}

async function update(tenantId, id, data) {
  data.updated_at = db.fn.now();
  const [subject] = await db('subjects')
    .where({ tenant_id: tenantId, id })
    .update(data)
    .returning('*');
  return subject;
}

async function remove(tenantId, id) {
  return db('subjects').where({ tenant_id: tenantId, id }).del();
}

module.exports = { create, findAll, findById, update, remove };
