const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, userId, data) {
  const [expense] = await db('expenses')
    .insert({ ...data, tenant_id: tenantId, created_by: userId })
    .returning('*');
  return expense;
}

async function findAll(tenantId, { page = 1, limit = 20, category, from_date, to_date } = {}) {
  let query = db('expenses')
    .where({ tenant_id: tenantId })
    .orderBy('expense_date', 'desc');
  if (category) query = query.where({ category });
  if (from_date) query = query.where('expense_date', '>=', from_date);
  if (to_date) query = query.where('expense_date', '<=', to_date);
  return paginatedResult(query, page, limit);
}

async function findById(tenantId, id) {
  return db('expenses').where({ tenant_id: tenantId, id }).first();
}

async function update(tenantId, id, data) {
  const [expense] = await db('expenses').where({ tenant_id: tenantId, id }).update(data).returning('*');
  return expense;
}

async function remove(tenantId, id) {
  return db('expenses').where({ tenant_id: tenantId, id }).del();
}

async function getTotalsByCategory(tenantId, { from_date, to_date } = {}) {
  let query = db('expenses').where({ tenant_id: tenantId }).select('category').sum('amount as total').groupBy('category');
  if (from_date) query = query.where('expense_date', '>=', from_date);
  if (to_date) query = query.where('expense_date', '<=', to_date);
  return query;
}

async function getTotalSpent(tenantId) {
  const result = await db('expenses').where({ tenant_id: tenantId }).sum('amount as total').first();
  return parseFloat(result?.total || 0);
}

module.exports = { create, findAll, findById, update, remove, getTotalsByCategory, getTotalSpent };
