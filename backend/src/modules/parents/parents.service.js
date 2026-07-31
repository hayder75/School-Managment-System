const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

const parentFields = [
  'users.id', 'users.email', 'users.first_name', 'users.last_name',
  'users.phone', 'users.avatar', 'users.role', 'users.status',
  'users.last_login', 'users.created_at',
];

async function findParents(tenantId, { page = 1, limit = 20, search } = {}) {
  let query = db('users')
    .where({ 'users.tenant_id': tenantId, 'users.role': 'parent' })
    .select(parentFields)
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
  const parent = await db('users')
    .where({ 'users.tenant_id': tenantId, 'users.id': id, 'users.role': 'parent' })
    .select(parentFields)
    .first();
  if (!parent) return null;
  const children = await db('student_parents')
    .where({ 'student_parents.parent_id': id, 'student_parents.tenant_id': tenantId })
    .leftJoin('students', 'student_parents.student_id', 'students.id')
    .leftJoin('users', 'students.user_id', 'users.id')
    .select(
      'student_parents.id as link_id',
      'students.id as student_id', 'students.student_number',
      'users.first_name', 'users.last_name',
      'student_parents.relationship', 'student_parents.is_primary'
    );
  return { ...parent, children };
}

async function linkParent(tenantId, data) {
  const { student_id, parent_id } = data;

  const [student] = await db('students').where({ id: student_id, tenant_id: tenantId }).select('id');
  if (!student) {
    const err = new Error('STUDENT_NOT_FOUND');
    err.code = 'STUDENT_NOT_FOUND';
    throw err;
  }

  const [parent] = await db('users')
    .where({ id: parent_id, tenant_id: tenantId, role: 'parent' })
    .select('id');
  if (!parent) {
    const err = new Error('PARENT_NOT_FOUND');
    err.code = 'PARENT_NOT_FOUND';
    throw err;
  }

  const existing = await db('student_parents')
    .where({ tenant_id: tenantId, student_id, parent_id })
    .select('id')
    .first();
  if (existing) {
    const err = new Error('ALREADY_LINKED');
    err.code = 'ALREADY_LINKED';
    throw err;
  }

  let { is_primary } = data;
  if (is_primary) {
    await db('student_parents')
      .where({ tenant_id: tenantId, student_id })
      .update({ is_primary: false });
  } else {
    const anyPrimary = await db('student_parents')
      .where({ tenant_id: tenantId, student_id, is_primary: true })
      .select('id')
      .first();
    if (!anyPrimary) is_primary = true;
  }

  const [link] = await db('student_parents')
    .insert({ ...data, is_primary, tenant_id: tenantId })
    .returning('*');
  return link;
}

async function unlinkParent(tenantId, id) {
  return db('student_parents').where({ tenant_id: tenantId, id }).del();
}

async function updateLink(tenantId, id, data) {
  const link = await db('student_parents').where({ tenant_id: tenantId, id }).first();
  if (!link) return null;

  let updateData = { ...data };
  if (updateData.is_primary) {
    await db('student_parents')
      .where({ tenant_id: tenantId, student_id: link.student_id })
      .update({ is_primary: false });
  } else if ('is_primary' in updateData && updateData.is_primary === false) {
    const otherPrimary = await db('student_parents')
      .where({ tenant_id: tenantId, student_id: link.student_id, is_primary: true })
      .whereNot('id', id)
      .select('id')
      .first();
    if (!otherPrimary) {
      updateData = { ...updateData, is_primary: true };
    }
  }

  const [updated] = await db('student_parents')
    .where({ tenant_id: tenantId, id })
    .update(updateData)
    .returning('*');
  return updated;
}

async function getChildrenForParent(tenantId, parentId) {
  const children = await db('student_parents')
    .where({ 'student_parents.parent_id': parentId, 'student_parents.tenant_id': tenantId })
    .leftJoin('students', 'student_parents.student_id', 'students.id')
    .leftJoin('users', 'students.user_id', 'users.id')
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select(
      'student_parents.id as link_id',
      'students.id', 'students.user_id', 'students.student_number', 'students.status',
      'users.first_name', 'users.last_name', 'users.email',
      'classes.name as class_name',
      'student_parents.relationship', 'student_parents.is_primary'
    );

  const userIds = children.map((c) => c.user_id).filter(Boolean);
  if (userIds.length > 0) {
    const balances = await db('payments')
      .where({ tenant_id: tenantId })
      .whereIn('student_id', userIds)
      .whereIn('status', ['pending', 'partial', 'overdue'])
      .groupBy('student_id')
      .select('student_id')
      .sum('balance as total_balance');
    const balanceMap = {};
    for (const b of balances) balanceMap[b.student_id] = parseFloat(b.total_balance || 0);
    for (const c of children) c.outstanding_balance = balanceMap[c.user_id] || 0;
  }

  return children;
}

module.exports = { findParents, findParentById, linkParent, unlinkParent, updateLink, getChildrenForParent };
