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
};
