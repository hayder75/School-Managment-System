const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, userId, data) {
  const [announcement] = await db('announcements')
    .insert({ ...data, tenant_id: tenantId, created_by: userId })
    .returning('*');
  return announcement;
}

async function findAll(tenantId, { page = 1, limit = 20, audience } = {}) {
  let query = db('announcements')
    .where({ 'announcements.tenant_id': tenantId })
    .leftJoin('users', 'announcements.created_by', 'users.id')
    .select('announcements.*', 'users.first_name', 'users.last_name')
    .orderBy('announcements.created_at', 'desc');
  if (audience) query = query.where('announcements.audience', audience);
  return paginatedResult(query, page, limit);
}

async function findById(tenantId, id) {
  return db('announcements')
    .where({ tenant_id: tenantId, id })
    .leftJoin('users', 'announcements.created_by', 'users.id')
    .select('announcements.*', 'users.first_name', 'users.last_name')
    .first();
}

async function update(tenantId, id, data) {
  data.updated_at = db.fn.now();
  const [announcement] = await db('announcements').where({ tenant_id: tenantId, id }).update(data).returning('*');
  return announcement;
}

async function remove(tenantId, id) {
  return db('announcements').where({ tenant_id: tenantId, id }).del();
}

async function findForUser(tenantId, userId, role, classIds) {
  let query = db('announcements')
    .where({ 'announcements.tenant_id': tenantId, 'announcements.is_published': true })
    .where(function () {
      this.where('announcements.audience', 'all')
        .orWhere('announcements.audience', role)
        .orWhere('announcements.audience', `${role}s`)
        .orWhere(function () {
          this.where('announcements.audience', 'class');
          if (classIds && classIds.length > 0) {
            this.whereIn('announcements.class_id', classIds);
          } else {
            this.whereRaw('1 = 0');
          }
        });
    })
    .leftJoin('users', 'announcements.created_by', 'users.id')
    .select('announcements.*', 'users.first_name', 'users.last_name')
    .orderBy('announcements.created_at', 'desc');

  return query;
}

module.exports = { create, findAll, findById, update, remove, findForUser };
