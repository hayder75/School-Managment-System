const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function findParents(tenantId, { page = 1, limit = 20, search } = {}) {
  let query = db('users')
    .where({ 'users.tenant_id': tenantId, 'users.role': 'parent' })
    .select('users.*')
    .orderBy('users.last_name', 'asc');
  if (search) {
    query = query.where(function () {
      this.where('users.first_name', 'ilike', `%${search}%`)
        .orWhere('users.last_name', 'ilike', `%${search}%`)
        .orWhere('users.email', 'ilike', `%${search}%`);
    });
  }
  return paginatedResult(query, page, limit);
}

async function findParentById(tenantId, id) {
  const parent = await db('users').where({ tenant_id: tenantId, id, role: 'parent' }).first();
  if (!parent) return null;
  const children = await db('student_parents')
    .where({ 'student_parents.parent_id': id })
    .leftJoin('students', 'student_parents.student_id', 'students.id')
    .leftJoin('users', 'students.user_id', 'users.id')
    .select(
      'students.id as student_id', 'students.student_number',
      'users.first_name', 'users.last_name',
      'student_parents.relationship', 'student_parents.is_primary'
    );
  return { ...parent, children };
}

async function linkParent(tenantId, data) {
  const [link] = await db('student_parents').insert({ ...data, tenant_id: tenantId }).returning('*');
  return link;
}

async function unlinkParent(tenantId, id) {
  return db('student_parents').where({ tenant_id: tenantId, id }).del();
}

async function updateLink(tenantId, id, data) {
  const [link] = await db('student_parents').where({ tenant_id: tenantId, id }).update(data).returning('*');
  return link;
}

async function getChildrenForParent(tenantId, parentId) {
  return db('student_parents')
    .where({ 'student_parents.parent_id': parentId })
    .leftJoin('students', 'student_parents.student_id', 'students.id')
    .leftJoin('users', 'students.user_id', 'users.id')
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select(
      'students.id', 'students.student_number', 'students.status',
      'users.first_name', 'users.last_name', 'users.email',
      'classes.name as class_name',
      'student_parents.relationship', 'student_parents.is_primary'
    );
}

module.exports = { findParents, findParentById, linkParent, unlinkParent, updateLink, getChildrenForParent };
