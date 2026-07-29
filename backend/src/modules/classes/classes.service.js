const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, data) {
  const [cls] = await db('classes').insert({ ...data, tenant_id: tenantId }).returning('*');
  return cls;
}

async function findAll(tenantId, { page = 1, limit = 20, academic_year_id } = {}) {
  let query = db('classes')
    .where({ 'classes.tenant_id': tenantId })
    .leftJoin('users', 'classes.class_teacher_id', 'users.id')
    .select(
      'classes.*',
      'users.first_name as teacher_first_name',
      'users.last_name as teacher_last_name'
    )
    .orderBy('classes.grade_level', 'asc')
    .orderBy('classes.name', 'asc');

  if (academic_year_id) query = query.where('classes.academic_year_id', academic_year_id);

  return paginatedResult(query, page, limit);
}

async function findById(tenantId, id) {
  return db('classes')
    .where({ 'classes.tenant_id': tenantId, 'classes.id': id })
    .leftJoin('users', 'classes.class_teacher_id', 'users.id')
    .select(
      'classes.*',
      'users.first_name as teacher_first_name',
      'users.last_name as teacher_last_name'
    )
    .first();
}

async function update(tenantId, id, data) {
  data.updated_at = db.fn.now();
  const [cls] = await db('classes')
    .where({ 'classes.tenant_id': tenantId, 'classes.id': id })
    .update(data)
    .returning('*');
  return cls;
}

async function remove(tenantId, id) {
  return db('classes').where({ 'classes.tenant_id': tenantId, 'classes.id': id }).del();
}

module.exports = { create, findAll, findById, update, remove };
