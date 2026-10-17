const db = require('../config/database');

async function getStudentForUser(tenantId, userId) {
  return db('students').where({ tenant_id: tenantId, user_id: userId }).first();
}

async function getChildrenUserIdsForParent(tenantId, parentId) {
  const rows = await db('student_parents')
    .where({ 'student_parents.tenant_id': tenantId, 'student_parents.parent_id': parentId })
    .leftJoin('students', 'student_parents.student_id', 'students.id')
    .select('students.user_id');
  return rows.map((r) => r.user_id).filter(Boolean);
}

async function teacherClassIds(tenantId, teacherId) {
  const rows = await db('teacher_subjects').where({ tenant_id: tenantId, teacher_id: teacherId }).select('class_id');
  return rows.map((r) => r.class_id);
}

async function isTeacherAssignedToClass(tenantId, teacherId, classId) {
  const row = await db('teacher_subjects')
    .where({ tenant_id: tenantId, teacher_id: teacherId, class_id: classId })
    .first();
  return !!row;
}

async function isTeacherAssignedToClassSubject(tenantId, teacherId, classId, subjectId) {
  const row = await db('teacher_subjects')
    .where({ tenant_id: tenantId, teacher_id: teacherId, class_id: classId, subject_id: subjectId })
    .first();
  return !!row;
}

async function teacherClassUserIds(tenantId, teacherId) {
  const rows = await db('students')
    .where({ 'students.tenant_id': tenantId })
    .whereIn('students.class_id', db('teacher_subjects')
      .where({ tenant_id: tenantId, teacher_id: teacherId })
      .select('class_id'))
    .select('students.user_id');
  return rows.map((r) => r.user_id).filter(Boolean);
}

async function canViewStudentByUserId(tenantId, userId, role, studentUserId) {
  if (role === 'admin' || role === 'owner' || role === 'super_admin' || role === 'cashier' || role === 'finance') return true;
  if (role === 'general_manager' || role === 'principal' || role === 'vice_principal' || role === 'quality_director' || role === 'shift_coordinator' || role === 'hr' || role === 'librarian') return true;
  if (role === 'student') {
    const s = await getStudentForUser(tenantId, userId);
    return !!s && s.user_id === studentUserId;
  }
  if (role === 'parent') {
    const ids = await getChildrenUserIdsForParent(tenantId, userId);
    return ids.includes(studentUserId);
  }
  if (role === 'teacher') {
    const student = await db('students').where({ tenant_id: tenantId, user_id: studentUserId }).first();
    if (!student || !student.class_id) return false;
    return isTeacherAssignedToClass(tenantId, userId, student.class_id);
  }
  return false;
}

async function canViewStudentRecord(tenantId, userId, role, studentRecordId) {
  const student = await db('students').where({ tenant_id: tenantId, id: studentRecordId }).first();
  if (!student) return false;
  return canViewStudentByUserId(tenantId, userId, role, student.user_id);
}

async function teacherSubjectIdsForStudent(tenantId, teacherId, studentUserId) {
  const student = await db('students').where({ tenant_id: tenantId, user_id: studentUserId }).select('class_id').first();
  if (!student?.class_id) return [];
  const rows = await db('teacher_subjects')
    .where({ tenant_id: tenantId, teacher_id: teacherId, class_id: student.class_id })
    .select('subject_id');
  return rows.map((r) => r.subject_id);
}

// ── Homeroom (class teacher) helpers ──
// Attendance is owned by the homeroom teacher of a class (classes.class_teacher_id),
// not by every teacher who happens to teach a subject in that class.

async function homeroomClassIds(tenantId, teacherId) {
  if (!teacherId) return [];
  const rows = await db('classes')
    .where({ tenant_id: tenantId, class_teacher_id: teacherId })
    .select('id');
  return rows.map((r) => r.id);
}

async function homeroomClasses(tenantId, teacherId) {
  if (!teacherId) return [];
  const classes = await db('classes')
    .where({ tenant_id: tenantId, class_teacher_id: teacherId })
    .select('id', 'name', 'grade_level', 'section', 'level_group')
    .orderBy('grade_level')
    .orderBy('name');
  if (!classes.length) return [];
  const ids = classes.map((c) => c.id);
  const counts = await db('students')
    .where({ tenant_id: tenantId, status: 'active' })
    .whereIn('class_id', ids)
    .groupBy('class_id')
    .select('class_id')
    .count('id as c');
  const map = Object.fromEntries(counts.map((r) => [r.class_id, Number(r.c)]));
  return classes.map((c) => ({ ...c, student_count: map[c.id] || 0 }));
}

async function isHomeroomTeacherOfClass(tenantId, teacherId, classId) {
  if (!teacherId || !classId) return false;
  const row = await db('classes')
    .where({ tenant_id: tenantId, id: classId, class_teacher_id: teacherId })
    .first();
  return !!row;
}

module.exports = {
  getStudentForUser,
  getChildrenUserIdsForParent,
  teacherClassIds,
  isTeacherAssignedToClass,
  isTeacherAssignedToClassSubject,
  teacherClassUserIds,
  canViewStudentByUserId,
  canViewStudentRecord,
  teacherSubjectIdsForStudent,
  homeroomClassIds,
  homeroomClasses,
  isHomeroomTeacherOfClass,
};
