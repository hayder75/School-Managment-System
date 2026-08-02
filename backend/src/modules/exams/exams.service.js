const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');
const broadcast = require('../../socket/broadcast');
const logger = require('../../config/logger');

async function create(tenantId, data, actorId = null) {
  const [exam] = await db('exams').insert({ ...data, tenant_id: tenantId }).returning('*');
  await notifyExamCreated(tenantId, exam, actorId);
  return exam;
}

async function notifyExamCreated(tenantId, exam, actorId) {
  try {
    const studentRows = await db('students')
      .where({ tenant_id: tenantId, class_id: exam.class_id })
      .select('user_id');
    const teacherRows = await db('teacher_subjects')
      .where({ tenant_id: tenantId, class_id: exam.class_id, subject_id: exam.subject_id })
      .select('teacher_id');
    const recipients = [
      ...studentRows.map((s) => s.user_id),
      ...teacherRows.map((t) => t.teacher_id),
    ].filter((id) => id && id !== actorId);

    await broadcast.notifyUsers(tenantId, recipients, {
      title: 'New Exam Scheduled',
      message: `${exam.name || 'An exam'} has been scheduled on ${exam.date || 'a new date'}.`,
      type: 'exam',
      refType: 'exam',
      refId: exam.id,
    });

    const parentRows = await db('student_parents')
      .join('students', 'student_parents.student_id', 'students.id')
      .where({ 'student_parents.tenant_id': tenantId, 'students.class_id': exam.class_id })
      .select('student_parents.parent_id');

    await broadcast.notifyUsers(tenantId, parentRows.map((p) => p.parent_id), {
      title: 'New Exam Scheduled',
      message: `A new exam "${exam.name || 'An exam'}" has been scheduled for your child's class on ${exam.date || 'a new date'}.`,
      type: 'exam',
      refType: 'exam',
      refId: exam.id,
    });
  } catch (err) {
    logger.error('Exam notification error', { error: err.message });
  }
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
