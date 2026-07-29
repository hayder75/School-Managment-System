const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, data) {
  const [student] = await db('students').insert({ ...data, tenant_id: tenantId }).returning('*');
  return student;
}

async function findAll(tenantId, { page = 1, limit = 20, class_id, status, search } = {}) {
  let query = db('students')
    .where({ 'students.tenant_id': tenantId })
    .leftJoin('users', 'students.user_id', 'users.id')
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select(
      'students.*',
      'users.first_name', 'users.last_name', 'users.email', 'users.phone',
      'classes.name as class_name'
    )
    .orderBy('users.last_name', 'asc');
  if (class_id) query = query.where('students.class_id', class_id);
  if (status) query = query.where('students.status', status);
  if (search) {
    query = query.where(function () {
      this.where('users.first_name', 'ilike', `%${search}%`)
        .orWhere('users.last_name', 'ilike', `%${search}%`)
        .orWhere('students.student_number', 'ilike', `%${search}%`);
    });
  }
  return paginatedResult(query, page, limit);
}

async function findById(tenantId, id) {
  return db('students')
    .where({ 'students.tenant_id': tenantId, 'students.id': id })
    .leftJoin('users', 'students.user_id', 'users.id')
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select(
      'students.*',
      'users.first_name', 'users.last_name', 'users.email', 'users.phone', 'users.avatar',
      'classes.name as class_name'
    )
    .first();
}

async function update(tenantId, id, data) {
  const [student] = await db('students').where({ tenant_id: tenantId, id }).update(data).returning('*');
  return student;
}

async function remove(tenantId, id) {
  return db('students').where({ tenant_id: tenantId, id }).del();
}

async function findByClass(tenantId, classId) {
  return db('students')
    .where({ 'students.tenant_id': tenantId, 'students.class_id': classId, 'students.status': 'active' })
    .leftJoin('users', 'students.user_id', 'users.id')
    .select('students.*', 'users.first_name', 'users.last_name', 'users.email')
    .orderBy('users.last_name', 'asc');
}

async function promote(tenantId, fromClassId, toClassId) {
  const updated = await db('students')
    .where({ tenant_id: tenantId, class_id: fromClassId, status: 'active' })
    .update({ class_id: toClassId });
  return { promoted: updated };
}

async function getEnrollmentStats(tenantId) {
  const total = await db('students').where({ tenant_id: tenantId }).count('* as total').first();
  const byClass = await db('students')
    .where({ 'students.tenant_id': tenantId })
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .groupBy('classes.name')
    .select('classes.name', db.raw('count(*) as count'));
  return { total: parseInt(total?.total || 0, 10), byClass };
}

module.exports = { create, findAll, findById, update, remove, findByClass, promote, getEnrollmentStats };
