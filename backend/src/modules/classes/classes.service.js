const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, data) {
  const [cls] = await db('classes').insert({ ...data, tenant_id: tenantId }).returning('*');
  return cls;
}

async function findAll(tenantId, { page = 1, limit = 20, academic_year_id, scopes } = {}) {
  let query = db('classes')
    .where({ 'classes.tenant_id': tenantId })
    .leftJoin('users', 'classes.class_teacher_id', 'users.id')
    .select(
      'classes.*',
      'users.first_name as teacher_first_name',
      'users.middle_name as teacher_middle_name',
      'users.last_name as teacher_last_name',
      db.raw("(select count(*) from students s where s.class_id = classes.id and s.status = 'active')::int as student_count"),
      db.raw("(select count(*) from class_support_staff csf where csf.class_id = classes.id)::int as support_count"),
      db.raw("(select string_agg(concat_ws(' ', u2.first_name, u2.last_name), ', ') from class_support_staff csf join users u2 on u2.id = csf.user_id where csf.class_id = classes.id) as support_names")
    )
    .orderBy(db.raw("CASE classes.level_group WHEN 'nursery' THEN 0 WHEN 'kg' THEN 1 WHEN 'primary' THEN 2 WHEN 'secondary' THEN 3 ELSE 4 END"), 'asc')
    .orderBy('classes.grade_level', 'asc')
    .orderBy('classes.name', 'asc');

  if (scopes && scopes.length) query = query.whereIn('classes.level_group', scopes);
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
      'users.middle_name as teacher_middle_name',
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

async function setHomeroom(tenantId, id, teacherId) {
  const [cls] = await db('classes')
    .where({ tenant_id: tenantId, id })
    .update({ class_teacher_id: teacherId || null, updated_at: db.fn.now() })
    .returning('*');
  return cls;
}


async function listSupportStaff(tenantId, classId) {
  return db('class_support_staff as csf')
    .join('users as u', 'csf.user_id', 'u.id')
    .where({ 'csf.tenant_id': tenantId, 'csf.class_id': classId })
    .select(
      'csf.id',
      'csf.user_id',
      'csf.can_mark_attendance',
      'csf.can_enter_marks',
      'csf.created_at',
      'u.first_name',
      'u.middle_name',
      'u.last_name',
      'u.email',
      'u.role'
    )
    .orderBy('u.first_name');
}

async function addSupportStaff(tenantId, classId, userId, { canMarkAttendance = true, canEnterMarks = true } = {}, createdBy = null) {
  const cls = await db('classes').where({ tenant_id: tenantId, id: classId }).first();
  if (!cls) throw Object.assign(new Error('CLASS_NOT_FOUND'), { code: 'CLASS_NOT_FOUND' });
  const user = await db('users').where({ tenant_id: tenantId, id: userId }).first();
  if (!user) throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' });
  if (user.role !== 'teacher') {
    throw Object.assign(new Error('SUPPORT_MUST_BE_TEACHER'), { code: 'SUPPORT_MUST_BE_TEACHER' });
  }
  if (cls.class_teacher_id === userId) {
    throw Object.assign(new Error('ALREADY_HOMEROOM'), { code: 'ALREADY_HOMEROOM' });
  }
  const [row] = await db('class_support_staff')
    .insert({
      tenant_id: tenantId,
      class_id: classId,
      user_id: userId,
      can_mark_attendance: canMarkAttendance !== false,
      can_enter_marks: canEnterMarks !== false,
      created_by: createdBy,
    })
    .onConflict(['class_id', 'user_id'])
    .merge({
      can_mark_attendance: canMarkAttendance !== false,
      can_enter_marks: canEnterMarks !== false,
    })
    .returning('*');
  return row;
}

async function removeSupportStaff(tenantId, classId, userId) {
  return db('class_support_staff')
    .where({ tenant_id: tenantId, class_id: classId, user_id: userId })
    .del();
}

module.exports = { create, findAll, findById, update, remove, setHomeroom, listSupportStaff, addSupportStaff, removeSupportStaff };
