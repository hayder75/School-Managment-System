const db = require('../../config/database');

async function upsertGrades(tenantId, examId, grades, userId) {
  const rows = await Promise.all(
    grades.map(async (g) => {
      const existing = await db('grades')
        .where({ tenant_id: tenantId, exam_id: examId, student_id: g.student_id })
        .first();

      if (existing && existing.locked_by) {
        return null;
      }

      const data = {
        tenant_id: tenantId,
        exam_id: examId,
        student_id: g.student_id,
        marks_obtained: g.marks_obtained ?? null,
        grade_letter: g.grade_letter || null,
        remarks: g.remarks || null,
        updated_at: db.fn.now(),
      };

      if (existing) {
        await db('grades').where({ id: existing.id }).update(data);
        return { ...existing, ...data };
      } else {
        const [row] = await db('grades').insert(data).returning('*');
        return row;
      }
    })
  );

  return rows.filter(Boolean);
}

async function getByExam(tenantId, examId) {
  return db('grades')
    .where({ 'grades.tenant_id': tenantId, 'grades.exam_id': examId })
    .leftJoin('users', 'grades.student_id', 'users.id')
    .select(
      'grades.*',
      'users.first_name',
      'users.last_name',
      'users.email'
    )
    .orderBy('users.first_name');
}

async function getByStudent(tenantId, studentId) {
  return db('grades')
    .where({ 'grades.tenant_id': tenantId, 'grades.student_id': studentId })
    .leftJoin('exams', 'grades.exam_id', 'exams.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select(
      'grades.*',
      'exams.name as exam_name',
      'exams.type as exam_type',
      'exams.total_marks',
      'exams.date as exam_date',
      'subjects.name as subject_name'
    )
    .orderBy('exams.date', 'desc');
}

async function lockGrades(tenantId, examId, lock, userId) {
  const data = lock
    ? { locked_by: userId, locked_at: db.fn.now() }
    : { locked_by: null, locked_at: null };

  await db('grades').where({ tenant_id: tenantId, exam_id: examId }).update(data);
  return { locked: lock };
}

module.exports = { upsertGrades, getByExam, getByStudent, lockGrades };
