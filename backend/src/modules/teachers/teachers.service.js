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

async function assignSubjectsBulk(tenantId, teacherId, { subject_ids, class_ids }) {
  const rows = [];
  for (const subject_id of subject_ids) {
    for (const class_id of class_ids) {
      rows.push({ tenant_id: tenantId, teacher_id: teacherId, subject_id, class_id, is_primary: false });
    }
  }
  if (!rows.length) return { inserted: 0, skipped: 0 };
  const inserted = await db('teacher_subjects')
    .insert(rows)
    .onConflict(['teacher_id', 'subject_id', 'class_id'])
    .ignore()
    .returning('id');
  return { inserted: inserted.length, skipped: rows.length - inserted.length };
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
      'users.section_count',
      'users.periods_per_week',
      'users.overtime_periods',
      'users.total_periods',
      'users.joined_at',
      'users.basic_salary',
      'users.allowance',
      'users.housing_allowance',
      'users.account_allowance',
      'users.phone_allowance',
      'users.created_at'
    )
    .orderBy('users.last_name', 'asc');

  if (search) {
    const { phoneDigits } = require('../../shared/search');
    const term = `%${String(search).trim()}%`;
    const digits = phoneDigits(search);
    query = query.where(function () {
      this.where('users.first_name', 'ilike', term)
        .orWhere('users.last_name', 'ilike', term)
        .orWhere('users.email', 'ilike', term)
        .orWhere('users.username', 'ilike', term)
        .orWhere('users.job_title', 'ilike', term)
        .orWhere('users.qualification', 'ilike', term)
        .orWhereRaw("CONCAT_WS(' ', users.first_name, users.middle_name, users.last_name) ILIKE ?", [term]);
      if (digits) {
        this.orWhereRaw("regexp_replace(coalesce(users.phone, ''), '\\D', '', 'g') LIKE ?", [`%${digits}%`]);
      }
      // also match by the subjects / classes the teacher teaches
      this.orWhereExists(function () {
        this.select(db.raw('1')).from('teacher_subjects as ts')
          .leftJoin('subjects as s', 'ts.subject_id', 's.id')
          .leftJoin('classes as c', 'ts.class_id', 'c.id')
          .whereRaw('ts.teacher_id = users.id')
          .where(function () {
            this.where('s.name', 'ilike', term).orWhere('c.name', 'ilike', term).orWhere('s.code', 'ilike', term);
          });
      });
    });
  }

  return paginatedResult(query, page, limit);
}

module.exports = { assignSubject, assignSubjectsBulk, getAssignments, removeAssignment, findTeachers };
