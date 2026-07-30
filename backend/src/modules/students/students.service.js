const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, data) {
  const [student] = await db('students').insert({ ...data, tenant_id: tenantId }).returning('*');
  return student;
}

async function enroll(tenantId, userId, data) {
  const { guardians, ...studentData } = data;
  const [student] = await db('students').insert({ ...studentData, tenant_id: tenantId }).returning('*');

  if (guardians && guardians.length > 0) {
    const links = guardians.map((g) => ({
      tenant_id: tenantId,
      student_id: student.id,
      parent_id: g.parent_id,
      relationship: g.relationship || null,
      is_primary: g.is_primary || false,
    }));
    await db('student_parents').insert(links);
  }

  await db('student_status_history').insert({
    tenant_id: tenantId,
    student_id: student.id,
    from_status: null,
    to_status: studentData.status || 'active',
    changed_by: userId,
  });

  return student;
}

async function findAll(tenantId, { page = 1, limit = 20, class_id, status, search, user_id } = {}) {
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
  if (user_id) query = query.where('students.user_id', user_id);
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
  const student = await db('students')
    .where({ 'students.tenant_id': tenantId, 'students.id': id })
    .leftJoin('users', 'students.user_id', 'users.id')
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select(
      'students.*',
      'users.first_name', 'users.last_name', 'users.email', 'users.phone', 'users.avatar',
      'classes.name as class_name'
    )
    .first();

  if (student) {
    student.guardians = await db('student_parents')
      .where({ student_id: id })
      .leftJoin('users', 'student_parents.parent_id', 'users.id')
      .select('student_parents.*', 'users.first_name', 'users.last_name', 'users.email', 'users.phone');
  }

  return student;
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

async function promote(tenantId, userId, data) {
  const { student_ids, from_class_id, to_class_id, academic_year } = data;
  const updated = await db('students')
    .whereIn('id', student_ids)
    .where({ tenant_id: tenantId, class_id: from_class_id, status: 'active' })
    .update({ class_id: to_class_id });

  if (updated > 0) {
    const records = student_ids.map((sid) => ({
      tenant_id: tenantId,
      student_id: sid,
      from_class_id,
      to_class_id,
      academic_year: academic_year || null,
      promoted_by: userId,
    }));
    await db('student_promotions').insert(records);
  }

  return { promoted: updated };
}

async function graduate(tenantId, userId, data) {
  const { student_ids, certificate_number, academic_year } = data;
  const updated = await db('students')
    .whereIn('id', student_ids)
    .where({ tenant_id: tenantId, status: 'active' })
    .update({ status: 'graduated' });

  if (updated > 0) {
    const records = student_ids.map((sid) => ({
      tenant_id: tenantId,
      student_id: sid,
      certificate_number: certificate_number || null,
      academic_year: academic_year || null,
      graduated_by: userId,
    }));
    await db('student_graduations').insert(records);
  }

  return { graduated: updated };
}

async function transfer(tenantId, userId, data) {
  const { student_id, transfer_type, to_class_id, reason } = data;
  const student = await db('students').where({ tenant_id: tenantId, id: student_id }).first();
  if (!student) throw new Error('Student not found');

  const from_class_id = student.class_id;

  await db('students').where({ id: student_id }).update({ class_id: to_class_id });
  await db('student_transfers').insert({
    tenant_id: tenantId,
    student_id,
    transfer_type: transfer_type || 'internal',
    from_class_id,
    to_class_id,
    reason: reason || null,
    transferred_by: userId,
  });

  return { student_id, from_class_id, to_class_id };
}

async function getDocuments(tenantId, studentId) {
  return db('student_documents').where({ tenant_id: tenantId, student_id: studentId }).orderBy('created_at', 'desc');
}

async function addDocument(tenantId, userId, studentId, data) {
  const [doc] = await db('student_documents').insert({
    ...data,
    tenant_id: tenantId,
    student_id: studentId,
    uploaded_by: userId,
  }).returning('*');
  return doc;
}

async function removeDocument(tenantId, studentId, docId) {
  return db('student_documents').where({ tenant_id: tenantId, student_id: studentId, id: docId }).del();
}

async function getMedical(tenantId, studentId) {
  return db('student_medical').where({ tenant_id: tenantId, student_id: studentId }).first();
}

async function upsertMedical(tenantId, studentId, data) {
  const existing = await db('student_medical').where({ tenant_id: tenantId, student_id: studentId }).first();
  if (existing) {
    const [updated] = await db('student_medical').where({ id: existing.id }).update(data).returning('*');
    return updated;
  }
  const [created] = await db('student_medical').insert({ ...data, tenant_id: tenantId, student_id: studentId }).returning('*');
  return created;
}

async function getDiscipline(tenantId, studentId) {
  return db('student_discipline')
    .where({ tenant_id: tenantId, student_id: studentId })
    .orderBy('created_at', 'desc');
}

async function addDiscipline(tenantId, userId, studentId, data) {
  const [record] = await db('student_discipline').insert({
    ...data,
    tenant_id: tenantId,
    student_id: studentId,
    recorded_by: userId,
  }).returning('*');
  return record;
}

async function updateDisciplineStatus(tenantId, studentId, recordId, data) {
  const updateData = { ...data };
  if (data.status === 'resolved' || data.status === 'dismissed') {
    updateData.resolved_by = data.resolved_by;
    updateData.resolved_at = db.fn.now();
  }
  const [record] = await db('student_discipline')
    .where({ tenant_id: tenantId, student_id: studentId, id: recordId })
    .update(updateData).returning('*');
  return record;
}

async function removeDiscipline(tenantId, studentId, recordId) {
  return db('student_discipline').where({ tenant_id: tenantId, student_id: studentId, id: recordId }).del();
}

async function getAchievements(tenantId, studentId) {
  return db('student_achievements')
    .where({ tenant_id: tenantId, student_id: studentId })
    .orderBy('created_at', 'desc');
}

async function addAchievement(tenantId, userId, studentId, data) {
  const [achievement] = await db('student_achievements').insert({
    ...data,
    tenant_id: tenantId,
    student_id: studentId,
    recorded_by: userId,
  }).returning('*');
  return achievement;
}

async function removeAchievement(tenantId, studentId, achievementId) {
  return db('student_achievements').where({ tenant_id: tenantId, student_id: studentId, id: achievementId }).del();
}

async function getStatusHistory(tenantId, studentId) {
  return db('student_status_history')
    .where({ tenant_id: tenantId, student_id: studentId })
    .orderBy('created_at', 'desc');
}

async function addStatusHistory(tenantId, studentId, fromStatus, toStatus, userId, reason) {
  await db('student_status_history').insert({
    tenant_id: tenantId,
    student_id: studentId,
    from_status: fromStatus,
    to_status: toStatus,
    reason: reason || null,
    changed_by: userId,
  });
}

async function getEnrollmentStats(tenantId) {
  const total = await db('students').where({ tenant_id: tenantId }).count('* as total').first();
  const byClass = await db('students')
    .where({ 'students.tenant_id': tenantId })
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .groupBy('classes.name')
    .select('classes.name', db.raw('count(*) as count'));
  const byStatus = await db('students')
    .where({ tenant_id: tenantId })
    .groupBy('status')
    .select('status', db.raw('count(*) as count'));
  return {
    total: parseInt(total?.total || 0, 10),
    byClass: byClass || [],
    byStatus: byStatus || [],
  };
}

module.exports = {
  create, enroll, findAll, findById, update, remove,
  findByClass, promote, graduate, transfer,
  getDocuments, addDocument, removeDocument,
  getMedical, upsertMedical,
  getDiscipline, addDiscipline, updateDisciplineStatus, removeDiscipline,
  getAchievements, addAchievement, removeAchievement,
  getStatusHistory, addStatusHistory, getEnrollmentStats,
};
