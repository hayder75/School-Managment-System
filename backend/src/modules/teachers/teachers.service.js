const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function assignSubject(tenantId, teacherId, data) {
  const [assignment] = await db('teacher_subjects')
    .insert({
      tenant_id: tenantId,
      teacher_id: teacherId,
      subject_id: data.subject_id,
      class_id: data.class_id,
      is_primary: data.is_primary || false,
    })
    .returning('*');
  return assignment;
}

async function getAssignments(tenantId, teacherId) {
  return db('teacher_subjects')
    .where({ 'teacher_subjects.tenant_id': tenantId, 'teacher_subjects.teacher_id': teacherId })
    .leftJoin('subjects', 'teacher_subjects.subject_id', 'subjects.id')
    .leftJoin('classes', 'teacher_subjects.class_id', 'classes.id')
    .select(
      'teacher_subjects.*',
      'subjects.name as subject_name',
      'subjects.code as subject_code',
      'classes.name as class_name',
      'classes.grade_level',
      'classes.section'
    )
    .orderBy('classes.grade_level');
}

async function removeAssignment(tenantId, teacherId, assignmentId) {
  return db('teacher_subjects')
    .where({ tenant_id: tenantId, teacher_id: teacherId, id: assignmentId })
    .del();
}

async function findTeachers(tenantId, { page = 1, limit = 20, search } = {}) {
  let query = db('users')
    .where({ tenant_id: tenantId, role: 'teacher' })
    .select(
      'users.id',
      'users.first_name',
      'users.last_name',
      'users.email',
      'users.phone',
      'users.status',
      'users.job_title',
      'users.qualification',
      'users.field_of_study',
      'users.gender',
      'users.created_at'
    )
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

module.exports = { assignSubject, getAssignments, removeAssignment, findTeachers };
