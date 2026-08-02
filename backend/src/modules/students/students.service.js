const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, data) {
  const [student] = await db('students').insert({ ...data, tenant_id: tenantId }).returning('*');
  return student;
}

async function enroll(tenantId, userId, data) {
  const { guardians, enrollment, ...studentData } = data;

  return db.transaction(async (trx) => {
    const [student] = await trx('students').insert({ ...studentData, tenant_id: tenantId }).returning('*');

    if (guardians && guardians.length > 0) {
      const uniqueGuardians = [];
      const seen = new Set();
      for (const g of guardians) {
        if (g.parent_id && !seen.has(g.parent_id)) {
          seen.add(g.parent_id);
          uniqueGuardians.push(g);
        }
      }

      if (uniqueGuardians.length > 0) {
        const parentIds = uniqueGuardians.map((g) => g.parent_id);
        const parents = await trx('users')
          .where({ tenant_id: tenantId, role: 'parent' })
          .whereIn('id', parentIds)
          .select('id');
        if (parents.length !== uniqueGuardians.length) {
          const err = new Error('PARENT_NOT_FOUND');
          err.code = 'PARENT_NOT_FOUND';
          throw err;
        }
      }

      let hasPrimary = false;
      const links = uniqueGuardians.map((g) => {
        const isPrimary = g.is_primary === true || (!hasPrimary && !uniqueGuardians.some((x) => x.is_primary === true));
        if (isPrimary) hasPrimary = true;
        return {
          tenant_id: tenantId,
          student_id: student.id,
          parent_id: g.parent_id,
          relationship: g.relationship || null,
          is_primary: isPrimary,
          education_level: g.education_level || null,
        };
      });
      if (links.length > 0) {
        await trx('student_parents').insert(links);
      }
    }

    if (enrollment && Object.keys(enrollment).length > 0) {
      await trx('enrollments').insert({
        tenant_id: tenantId,
        student_id: student.id,
        academic_year_id: enrollment.academic_year_id || null,
        class_id: enrollment.class_id || studentData.class_id || null,
        grade_level: enrollment.grade_level ?? null,
        section: enrollment.section || null,
        admission_category: enrollment.admission_category || null,
        admission_modality: enrollment.admission_modality || null,
        education_stream: enrollment.education_stream || null,
        cte_field_1: enrollment.cte_field_1 || null,
        cte_field_2: enrollment.cte_field_2 || null,
        num_textbooks: enrollment.num_textbooks ?? null,
        instructional_language: enrollment.instructional_language || null,
        school_feeding: enrollment.school_feeding || false,
        food_ration_home: enrollment.food_ration_home || false,
        meals_per_week: enrollment.meals_per_week ?? null,
      });
    }

    await trx('student_status_history').insert({
      tenant_id: tenantId,
      student_id: student.id,
      from_status: null,
      to_status: studentData.status || 'active',
      changed_by: userId,
    });

    return student;
  });
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

async function findAllByUserIds(tenantId, { page = 1, limit = 20, class_id, status, search, userIds } = {}) {
  if (!userIds || userIds.length === 0) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
  let query = db('students')
    .where({ 'students.tenant_id': tenantId })
    .whereIn('students.user_id', userIds)
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

async function findAllByClassIds(tenantId, { page = 1, limit = 20, status, search, classIds } = {}) {
  if (!classIds || classIds.length === 0) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
  let query = db('students')
    .where({ 'students.tenant_id': tenantId })
    .whereIn('students.class_id', classIds)
    .leftJoin('users', 'students.user_id', 'users.id')
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .select(
      'students.*',
      'users.first_name', 'users.last_name', 'users.email', 'users.phone',
      'classes.name as class_name'
    )
    .orderBy('users.last_name', 'asc');
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
    student.enrollments = await getEnrollments(tenantId, id);
  }

  return student;
}

async function getEnrollments(tenantId, studentId) {
  return db('enrollments')
    .where({ 'enrollments.tenant_id': tenantId, 'enrollments.student_id': studentId })
    .leftJoin('academic_years', 'enrollments.academic_year_id', 'academic_years.id')
    .leftJoin('classes', 'enrollments.class_id', 'classes.id')
    .select(
      'enrollments.*',
      'academic_years.name as academic_year_name',
      'classes.name as class_name'
    )
    .orderBy('academic_years.start_date', 'desc');
}

async function addEnrollment(tenantId, studentId, data) {
  const [enr] = await db('enrollments')
    .insert({ ...data, tenant_id: tenantId, student_id: studentId })
    .onConflict(['tenant_id', 'student_id', 'academic_year_id'])
    .merge()
    .returning('*');
  return enr;
}

async function updateEnrollment(tenantId, studentId, enrollmentId, data) {
  const [enr] = await db('enrollments')
    .where({ tenant_id: tenantId, student_id: studentId, id: enrollmentId })
    .update(data)
    .returning('*');
  return enr;
}

async function removeEnrollment(tenantId, studentId, enrollmentId) {
  return db('enrollments').where({ tenant_id: tenantId, student_id: studentId, id: enrollmentId }).del();
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

  return db.transaction(async (trx) => {
    const updated = await trx('students')
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
      await trx('student_promotions').insert(records);

      await reconcileAttendance(trx, tenantId, student_ids, from_class_id, to_class_id);
    }

    return { promoted: updated };
  });
}

async function graduate(tenantId, userId, data) {
  const { student_ids, certificate_number, academic_year } = data;

  return db.transaction(async (trx) => {
    const updated = await trx('students')
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
      await trx('student_graduations').insert(records);
    }

    return { graduated: updated };
  });
}

async function transfer(tenantId, userId, data) {
  const { student_id, transfer_type, to_class_id, reason, previous_school, transfer_date } = data;

  return db.transaction(async (trx) => {
    const student = await trx('students').where({ tenant_id: tenantId, id: student_id }).first();
    if (!student) throw new Error('Student not found');

    const from_class_id = student.class_id;

    const updateData = { class_id: to_class_id };
    if (transfer_type === 'external_in') {
      updateData.admission_type = 'transfer_in';
      if (previous_school) updateData.previous_school = previous_school;
      if (transfer_date) updateData.transfer_date = transfer_date;
    }
    await trx('students').where({ id: student_id }).update(updateData);
    await trx('student_transfers').insert({
      tenant_id: tenantId,
      student_id,
      transfer_type: transfer_type || 'internal',
      from_class_id,
      to_class_id,
      reason: reason || null,
      previous_school: previous_school || null,
      transfer_date: transfer_date || null,
      transferred_by: userId,
    });

    if (from_class_id && from_class_id !== to_class_id) {
      await reconcileAttendance(trx, tenantId, [student_id], from_class_id, to_class_id);
    }

    return { student_id, from_class_id, to_class_id };
  });
}

async function reconcileAttendance(trx, tenantId, studentIds, fromClassId, toClassId) {
  const studentUserIds = await trx('students')
    .where({ tenant_id: tenantId })
    .whereIn('id', studentIds)
    .select('user_id');
  const userIds = studentUserIds.map((s) => s.user_id);

  if (userIds.length === 0) return;

  const newClassRows = await trx('attendance')
    .where({ tenant_id: tenantId, class_id: toClassId })
    .whereIn('student_id', userIds)
    .select('student_id', 'date');
  const occupied = new Set(newClassRows.map((r) => `${r.student_id}|${r.date}`));

  const oldRows = await trx('attendance')
    .where({ tenant_id: tenantId, class_id: fromClassId })
    .whereIn('student_id', userIds)
    .select('id', 'student_id', 'date');

  for (const row of oldRows) {
    const key = `${row.student_id}|${row.date}`;
    if (occupied.has(key)) {
      await trx('attendance').where({ id: row.id }).del();
    } else {
      await trx('attendance').where({ id: row.id }).update({ class_id: toClassId });
    }
  }
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
  create, enroll, findAll, findAllByUserIds, findAllByClassIds, findById, update, remove,
  findByClass, promote, graduate, transfer,
  getDocuments, addDocument, removeDocument,
  getMedical, upsertMedical,
  getDiscipline, addDiscipline, updateDisciplineStatus, removeDiscipline,
  getAchievements, addAchievement, removeAchievement,
  getStatusHistory, addStatusHistory, getEnrollmentStats,
  getEnrollments, addEnrollment, updateEnrollment, removeEnrollment,
};
