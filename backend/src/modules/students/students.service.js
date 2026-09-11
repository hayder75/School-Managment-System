const db = require('../../config/database');
const bcrypt = require('bcrypt');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, data) {
  const [student] = await db('students').insert({ ...data, tenant_id: tenantId }).returning('*');
  return student;
}

async function uniqueUsername(trx, tenantId, base) {
  let candidate = base;
  let n = 1;
  while (await trx('users').where({ tenant_id: tenantId, username: candidate }).first()) {
    candidate = `${base}${n}`;
    n += 1;
    if (n > 50) { candidate = `${base}${Date.now().toString(36).slice(-4)}`; break; }
  }
  return candidate;
}

const DEFAULT_HASH = "$2b$10$wWA7YLyqHZS86hcYSnGIuuMMLEJOF5S17ly/2.BUvuZZOS1UUs6ia"; // "1234"

// Derive the next sequential student number for the current year, based on the
// highest existing number (rather than a count), so deletions and concurrent
// creates cannot collide.
async function nextStudentNumber(trx, tenantId) {
  const prefix = `ST-${new Date().getFullYear()}-`;
  const row = await trx('students')
    .where('tenant_id', tenantId)
    .whereRaw('student_number ~ ?', [`^${prefix}\\d+$`])
    .whereNotNull('student_number')
    .orderBy('student_number', 'desc')
    .select('student_number')
    .first();
  let seq = 0;
  if (row && row.student_number) {
    const m = row.student_number.match(/-(\d+)$/);
    if (m) seq = parseInt(m[1], 10);
  }
  return `${prefix}${String(seq + 1).padStart(4, '0')}`;
}


async function enroll(tenantId, userId, data) {
  const { guardians = [], new_guardians = [], enrollment, first_name, last_name, student_email, ...studentData } = data;
  const providedNumber = studentData.student_number;

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    // On a collision retry, let the auto-number regenerate.
    if (attempt > 0 && !providedNumber) delete studentData.student_number;
    const creds = { student: null, guardians: [] };
    try {
      return await db.transaction(async (trx) => {
        // Generate a student number when missing (also becomes the login username)
        if (!studentData.student_number) {
          studentData.student_number = await nextStudentNumber(trx, tenantId);
        }

    // Auto-create the student's login account when not linked to an existing user
    let studentUserId = studentData.user_id;
    if (!studentUserId) {
      const email = student_email || `${(first_name || 'student').toLowerCase().replace(/\s+/g, '')}.${Date.now().toString(36)}@students.mountolive.edu.et`;
      const username = await uniqueUsername(trx, tenantId, studentData.student_number);
      const [u] = await trx('users')
        .insert({
          tenant_id: tenantId,
          first_name: first_name || 'Student',
          last_name: last_name || studentData.father_name || '',
          email,
          username,
          role: 'student',
          status: 'active',
          phone: studentData.emergency_contact || null,
          gender: studentData.gender || null,
          password_hash: DEFAULT_HASH,
        })
        .returning('*');
      studentUserId = u.id;
      creds.student = { username };
    }

    const [student] = await trx('students')
      .insert({ ...studentData, user_id: studentUserId, tenant_id: tenantId })
      .returning('*');

    // Create brand-new guardian accounts inline
    const allGuardians = [...guardians];
    for (const ng of new_guardians) {
      const email = ng.email || `${ng.first_name.toLowerCase().replace(/\s+/g, '')}.${ng.last_name.toLowerCase().replace(/\s+/g, '') || 'parent'}.${Date.now().toString(36)}@parents.mountolive.edu.et`;
      const baseU = 'P' + String(ng.phone || '').replace(/\D/g, '').slice(-9);
      const username = await uniqueUsername(trx, tenantId, baseU || `P${Date.now().toString(36)}`);
      const [parentUser] = await trx('users')
        .insert({
          tenant_id: tenantId,
          first_name: ng.first_name,
          last_name: ng.last_name,
          email,
          username,
          phone: ng.phone,
          role: 'parent',
          status: 'active',
          password_hash: DEFAULT_HASH,
        })
        .returning('*');
      allGuardians.push({ ...ng, parent_id: parentUser.id });
      creds.guardians.push({
        name: `${ng.first_name} ${ng.last_name}`,
        username,
        relationship: ng.relationship || null,
      });
    }

    if (allGuardians.length > 0) {
      const uniqueGuardians = [];
      const seen = new Set();
      for (const g of allGuardians) {
        if (g.parent_id && !seen.has(g.parent_id)) {
          seen.add(g.parent_id);
          uniqueGuardians.push(g);
        }
      }

      const existingParents = await trx('users')
        .where({ tenant_id: tenantId, role: 'parent' })
        .whereIn('id', uniqueGuardians.map((g) => g.parent_id))
        .select('id');
      if (existingParents.length !== uniqueGuardians.length) {
        const err = new Error('PARENT_NOT_FOUND');
        err.code = 'PARENT_NOT_FOUND';
        throw err;
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

    // Always record academic enrollment history (even when the wizard did not
    // send an explicit enrollment object), deriving class/grade/year details.
    const enrollClassId = enrollment?.class_id || studentData.class_id || null;
    let cls = null;
    if (enrollClassId) {
      cls = await trx('classes')
        .where({ tenant_id: tenantId, id: enrollClassId })
        .select('id', 'grade_level', 'section', 'academic_year_id')
        .first();
    }
    let academicYearId = enrollment?.academic_year_id || cls?.academic_year_id || null;
    if (!academicYearId) {
      const cy = await trx('academic_years')
        .where({ tenant_id: tenantId, is_current: true })
        .select('id')
        .orderBy('start_date', 'desc')
        .first();
      academicYearId = cy?.id || null;
    }
    const gradeLevel = enrollment?.grade_level ?? cls?.grade_level ?? null;
    await trx('enrollments').insert({
      tenant_id: tenantId,
      student_id: student.id,
      academic_year_id: academicYearId,
      class_id: enrollClassId,
      grade_level: gradeLevel === null || gradeLevel === undefined ? null : String(gradeLevel),
      section: enrollment?.section || cls?.section || null,
      admission_category: enrollment?.admission_category || null,
      admission_modality: enrollment?.admission_modality || null,
      education_stream: enrollment?.education_stream || null,
      cte_field_1: enrollment?.cte_field_1 || null,
      cte_field_2: enrollment?.cte_field_2 || null,
      num_textbooks: enrollment?.num_textbooks ?? null,
      instructional_language: enrollment?.instructional_language || null,
      school_feeding: enrollment?.school_feeding || false,
      food_ration_home: enrollment?.food_ration_home || false,
      meals_per_week: enrollment?.meals_per_week ?? null,
    });

    await trx('student_status_history').insert({
      tenant_id: tenantId,
      student_id: student.id,
      from_status: null,
      to_status: studentData.status || 'active',
      changed_by: userId,
    });

        return { ...student, __credentials: creds };
      });
    } catch (err) {
      lastErr = err;
      const isNumberCollision = err.code === '23505' && String(err.constraint || '').includes('student_number');
      if (isNumberCollision && attempt < 2) continue;
      throw err;
    }
  }
  throw lastErr;
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
        .orWhere('users.phone', 'ilike', `%${search}%`)
        .orWhere('students.student_number', 'ilike', `%${search}%`)
        .orWhere('students.father_name', 'ilike', `%${search}%`)
        .orWhere('students.mother_name', 'ilike', `%${search}%`)
        .orWhereExists(function () {
          this.select(db.raw(1))
            .from('student_parents')
            .join('users as parents', 'parents.id', 'student_parents.parent_id')
            .whereRaw('student_parents.student_id = students.id')
            .where(function () {
              this.where('parents.first_name', 'ilike', `%${search}%`)
                .orWhere('parents.last_name', 'ilike', `%${search}%`)
                .orWhere('parents.phone', 'ilike', `%${search}%`);
            });
        });
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
  const { student_ids = [], from_class_id, to_class_id, academic_year } = data;

  return db.transaction(async (trx) => {
    // If no explicit students are given, promote the whole class (all active).
    let query = trx('students')
      .where({ tenant_id: tenantId, class_id: from_class_id, status: 'active' });
    if (student_ids.length > 0) query = query.whereIn('id', student_ids);
    const targets = await query.select('id');
    const ids = targets.map((r) => r.id);

    if (ids.length === 0) return { promoted: 0 };

    await trx('students')
      .where({ tenant_id: tenantId })
      .whereIn('id', ids)
      .update({ class_id: to_class_id });

    const records = ids.map((sid) => ({
      tenant_id: tenantId,
      student_id: sid,
      from_class_id,
      to_class_id,
      academic_year: academic_year || null,
      promoted_by: userId,
    }));
    await trx('student_promotions').insert(records);

    await reconcileAttendance(trx, tenantId, ids, from_class_id, to_class_id);

    // Keep the enrolment history in sync with the new class / academic year.
    const targetClass = await trx('classes')
      .where({ tenant_id: tenantId, id: to_class_id })
      .select('grade_level', 'section', 'academic_year_id')
      .first();
    let yearId = targetClass?.academic_year_id || null;
    if (!yearId) {
      const cy = await trx('academic_years')
        .where({ tenant_id: tenantId, is_current: true })
        .select('id')
        .orderBy('start_date', 'desc')
        .first();
      yearId = cy?.id || null;
    }
    const grade = targetClass?.grade_level ?? null;
    const gradeStr = grade === null || grade === undefined ? null : String(grade);

    for (const sid of ids) {
      const existing = await trx('enrollments')
        .where({ tenant_id: tenantId, student_id: sid, academic_year_id: yearId })
        .first();
      if (existing) {
        await trx('enrollments')
          .where({ id: existing.id })
          .update({ class_id: to_class_id, grade_level: gradeStr, section: targetClass?.section || existing.section });
      } else {
        await trx('enrollments').insert({
          tenant_id: tenantId,
          student_id: sid,
          academic_year_id: yearId,
          class_id: to_class_id,
          grade_level: gradeStr,
          section: targetClass?.section || null,
        });
      }
    }

    return { promoted: ids.length };
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
