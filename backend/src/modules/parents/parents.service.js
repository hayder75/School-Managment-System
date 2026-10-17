const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

const parentFields = [
  'users.id', 'users.email', 'users.first_name', 'users.middle_name', 'users.last_name',
  'users.phone', 'users.avatar', 'users.role', 'users.status',
  'users.last_login', 'users.created_at',
];

async function findParents(tenantId, { page = 1, limit = 20, search } = {}) {
  let query = db('users')
    .where({ 'users.tenant_id': tenantId, 'users.role': 'parent' })
    .select(parentFields)
    .select(db.raw("(select string_agg(concat_ws(' ', cu.first_name, cu.middle_name, cu.last_name), ', ') from student_parents sp join students st on sp.student_id = st.id join users cu on st.user_id = cu.id where sp.parent_id = users.id) as children_names"))
    // Parents were imported without names; derive the parent name from the linked
    // student's middle + last name (blank when the student has no surname).
    .select(db.raw("(select case when nullif(trim(coalesce(cu.last_name, '')), '') is null then null else concat_ws(' ', nullif(trim(coalesce(cu.middle_name, '')), ''), cu.last_name) end from student_parents sp join students st on sp.student_id = st.id join users cu on st.user_id = cu.id where sp.parent_id = users.id order by sp.is_primary desc nulls last limit 1) as guardian_name"))
    // order by the class of their children: Nursery -> KG -> Grade 1..8
    .orderByRaw("(select min(c.grade_level) from student_parents sp join students st on sp.student_id = st.id left join classes c on st.class_id = c.id where sp.parent_id = users.id) asc nulls last")
    .orderByRaw("(select min(c.name) from student_parents sp join students st on sp.student_id = st.id left join classes c on st.class_id = c.id where sp.parent_id = users.id) asc")
    .orderBy('users.last_name', 'asc');
  if (search) {
    const term = `%${String(search).trim()}%`;
    const { phoneDigits } = require('../../shared/search');
    const digits = phoneDigits(search);
    query = query.where(function () {
      this.where('users.first_name', 'ilike', term)
        .orWhere('users.last_name', 'ilike', term)
        .orWhere('users.email', 'ilike', term)
        .orWhere('users.username', 'ilike', term)
        .orWhere('users.phone', 'ilike', term)
        .orWhereRaw("CONCAT_WS(' ', users.first_name, users.middle_name, users.last_name) ILIKE ?", [term]);
      if (digits) {
        this.orWhereRaw("regexp_replace(coalesce(users.phone, ''), '\\D', '', 'g') LIKE ?", [`%${digits}%`]);
      }
      // match by the parent's children (student name or student number)
      this.orWhereExists(function () {
        this.select(db.raw('1')).from('student_parents as sp')
          .join('students as st', 'sp.student_id', 'st.id')
          .join('users as cu', 'st.user_id', 'cu.id')
          .whereRaw('sp.parent_id = users.id')
          .where(function () {
            this.where('cu.first_name', 'ilike', term).orWhere('cu.last_name', 'ilike', term).orWhere('st.student_number', 'ilike', term);
          });
      });
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
      'users.first_name', 'users.middle_name', 'users.last_name',
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
      'students.class_id',
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

async function uniqueUsername(trx, tenantId, base, excludeId) {
  let candidate = base;
  let n = 1;
  while (true) {
    const row = await trx('users').where({ tenant_id: tenantId, username: candidate }).first();
    if (!row || row.id === excludeId) return candidate;
    candidate = `${base}${n++}`;
    if (n > 60) return `${base}${Date.now().toString(36).slice(-4)}`;
  }
}

async function updateParent(tenantId, id, data) {
  return db.transaction(async (trx) => {
    const parent = await trx('users').where({ tenant_id: tenantId, id, role: 'parent' }).first();
    if (!parent) return null;
    const updates = {};
    for (const k of ['first_name', 'last_name', 'phone', 'email']) {
      if (data[k] !== undefined) updates[k] = data[k];
    }
    // Keep the login username in sync with the phone number.
    if (data.phone !== undefined && data.phone !== parent.phone) {
      const base = String(data.phone || '').trim()
        || `${parent.first_name || 'parent'}.${parent.last_name || id.slice(0, 6)}`.replace(/\s+/g, '');
      updates.username = await uniqueUsername(trx, tenantId, base, parent.id);
    }
    updates.updated_at = trx.fn.now();
    const [updated] = await trx('users').where({ id }).update(updates)
      .returning(['id', 'first_name', 'last_name', 'phone', 'email', 'username']);
    return updated;
  });
}

// Link a guardian to a student, creating the parent account if needed.
async function linkGuardian(tenantId, data) {
  const bcrypt = require('bcrypt');
  const { deriveParentName } = require('../../shared/person-name');
  const { student_id, relationship = 'guardian' } = data;
  const student = await db('students').where({ tenant_id: tenantId, id: student_id }).first();
  if (!student) { const e = new Error('STUDENT_NOT_FOUND'); e.code = 'STUDENT_NOT_FOUND'; throw e; }

  // Derive the guardian's display name from the student when not supplied.
  const child = await db('users').where({ id: student.user_id })
    .select('first_name', 'middle_name', 'last_name').first();
  const derived = deriveParentName(child);

  let parentId = data.parent_id || null;
  if (!parentId) {
    const phone = String(data.phone || '').replace(/\D/g, '');
    if (!phone) { const e = new Error('PHONE_REQUIRED'); e.code = 'PHONE_REQUIRED'; throw e; }
    const existing = await db('users').where({ tenant_id: tenantId, role: 'parent' })
      .whereRaw("regexp_replace(coalesce(phone, ''), '\\D', '', 'g') LIKE ?", [`%${phone.replace(/^0/, '')}%`]).first();
    if (existing) {
      parentId = existing.id;
      // Fill in a derived name for an existing parent that has none yet.
      if (!String(existing.first_name || '').trim() && !String(existing.last_name || '').trim()) {
        await db('users').where({ id: existing.id }).update({
          first_name: derived.first_name || '', last_name: derived.last_name || '', updated_at: db.fn.now(),
        });
      }
    } else {
      const uname = `p${phone}`;
      const [u] = await db('users').insert({
        tenant_id: tenantId, role: 'parent', status: 'active',
        first_name: data.first_name || derived.first_name || '',
        middle_name: data.middle_name || null,
        last_name: data.last_name || derived.last_name || '',
        phone: data.phone, username: uname, email: `${uname}@parents.mountolive.edu.et`,
        password_hash: bcrypt.hashSync('1234', 10),
      }).returning('id');
      parentId = u.id;
    }
  }

  const existing = await db('student_parents').where({ tenant_id: tenantId, student_id, parent_id: parentId }).first();
  if (existing) return { link_id: existing.id, parent_id: parentId, already: true };
  const anyPrimary = await db('student_parents').where({ tenant_id: tenantId, student_id, is_primary: true }).first();
  const [link] = await db('student_parents').insert({
    tenant_id: tenantId, student_id, parent_id: parentId, relationship, is_primary: !anyPrimary,
  }).returning('*');
  return link;
}

module.exports = { findParents, findParentById, linkParent, unlinkParent, updateLink, getChildrenForParent, updateParent, linkGuardian };
