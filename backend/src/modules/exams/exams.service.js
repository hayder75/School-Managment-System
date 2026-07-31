const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, data) {
  const [exam] = await db('exams').insert({ ...data, tenant_id: tenantId }).returning('*');
  return exam;
}

async function findAll(tenantId, { page = 1, limit = 20, class_id, subject_id } = {}) {
  let query = db('exams')
    .where({ 'exams.tenant_id': tenantId })
    .leftJoin('classes', 'exams.class_id', 'classes.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select('exams.*', 'classes.name as class_name', 'subjects.name as subject_name')
    .orderBy('exams.date', 'desc');

  if (class_id) query = query.where('exams.class_id', class_id);
  if (subject_id) query = query.where('exams.subject_id', subject_id);

  return paginatedResult(query, page, limit);
}

async function findAllForTeacher(tenantId, { page = 1, limit = 20, class_id, subject_id, teacherId } = {}) {
  let query = db('exams')
    .where({ 'exams.tenant_id': tenantId })
    .whereIn('exams.id', db('exams')
      .select('exams.id')
      .join('teacher_subjects', function () {
        this.on('exams.class_id', '=', 'teacher_subjects.class_id')
          .andOn('exams.subject_id', '=', 'teacher_subjects.subject_id');
      })
      .where('teacher_subjects.tenant_id', tenantId)
      .where('teacher_subjects.teacher_id', teacherId))
    .leftJoin('classes', 'exams.class_id', 'classes.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select('exams.*', 'classes.name as class_name', 'subjects.name as subject_name')
    .orderBy('exams.date', 'desc');

  if (class_id) query = query.where('exams.class_id', class_id);
  if (subject_id) query = query.where('exams.subject_id', subject_id);

  return paginatedResult(query, page, limit);
}

async function findAllForStudentUserIds(tenantId, { page = 1, limit = 20, subject_id, studentUserIds, requestedClassId } = {}) {
  let query = db('exams')
    .where({ 'exams.tenant_id': tenantId })
    .whereIn('exams.class_id', db('students')
      .where({ tenant_id: tenantId })
      .whereIn('user_id', studentUserIds)
      .select('class_id'))
    .leftJoin('classes', 'exams.class_id', 'classes.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select('exams.*', 'classes.name as class_name', 'subjects.name as subject_name')
    .orderBy('exams.date', 'desc');

  if (requestedClassId) query = query.where('exams.class_id', requestedClassId);
  if (subject_id) query = query.where('exams.subject_id', subject_id);

  return paginatedResult(query, page, limit);
}

async function studentInClass(tenantId, studentUserIds, classId) {
  const row = await db('students')
    .where({ tenant_id: tenantId, class_id: classId })
    .whereIn('user_id', studentUserIds)
    .first();
  return !!row;
}

async function findById(tenantId, id) {
  return db('exams')
    .where({ 'exams.tenant_id': tenantId, 'exams.id': id })
    .leftJoin('classes', 'exams.class_id', 'classes.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select('exams.*', 'classes.name as class_name', 'subjects.name as subject_name')
    .first();
}

async function update(tenantId, id, data) {
  data.updated_at = db.fn.now();
  const [exam] = await db('exams').where({ tenant_id: tenantId, id }).update(data).returning('*');
  return exam;
}

async function remove(tenantId, id) {
  const gradeCount = await db('grades')
    .where({ tenant_id: tenantId, exam_id: id })
    .count('* as count')
    .first();
  if (parseInt(gradeCount?.count || 0, 10) > 0) {
    const err = new Error('EXAM_HAS_GRADES');
    err.code = 'EXAM_HAS_GRADES';
    throw err;
  }
  return db('exams').where({ tenant_id: tenantId, id }).del();
}

module.exports = { create, findAll, findAllForTeacher, findAllForStudentUserIds, studentInClass, findById, update, remove };
