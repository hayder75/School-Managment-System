const db = require('../../config/database');
const broadcast = require('../../socket/broadcast');
const logger = require('../../config/logger');

function computeGradeLetter(marks, total) {
  if (marks == null || total == null || Number(total) <= 0) return null;
  const ratio = Number(marks) / Number(total);
  if (ratio >= 0.9) return 'A';
  if (ratio >= 0.8) return 'B';
  if (ratio >= 0.7) return 'C';
  if (ratio >= 0.6) return 'D';
  return 'F';
}

async function upsertGrades(tenantId, examId, grades, userId) {
  const exam = await db('exams').where({ tenant_id: tenantId, id: examId }).first();
  if (!exam) {
    const err = new Error('EXAM_NOT_FOUND');
    err.code = 'EXAM_NOT_FOUND';
    throw err;
  }

  if (exam.locked_by) {
    const err = new Error('EXAM_LOCKED');
    err.code = 'EXAM_LOCKED';
    throw err;
  }

  const totalMarks = exam.total_marks ? Number(exam.total_marks) : null;
  for (const g of grades) {
    if (g.marks_obtained != null && totalMarks != null && Number(g.marks_obtained) > totalMarks) {
      const err = new Error('MARKS_EXCEED_TOTAL');
      err.code = 'MARKS_EXCEED_TOTAL';
      err.studentId = g.student_id;
      err.marks = g.marks_obtained;
      err.total = totalMarks;
      throw err;
    }
  }

  const classStudents = await db('students')
    .where({ tenant_id: tenantId, class_id: exam.class_id })
    .whereIn('user_id', grades.map((g) => g.student_id))
    .select('user_id');
  const validStudents = new Set(classStudents.map((s) => s.user_id));

  const rows = await db.transaction(async (trx) => {
    const results = [];
    for (const g of grades) {
      if (!validStudents.has(g.student_id)) continue;

      const existing = await trx('grades')
        .where({ tenant_id: tenantId, exam_id: examId, student_id: g.student_id })
        .first();

      if (existing && existing.locked_by) {
        continue;
      }

      const data = {
        tenant_id: tenantId,
        exam_id: examId,
        student_id: g.student_id,
        marks_obtained: g.marks_obtained ?? null,
        grade_letter: computeGradeLetter(g.marks_obtained, totalMarks) || g.grade_letter || null,
        remarks: g.remarks || null,
        updated_at: db.fn.now(),
      };

      if (existing) {
        const [row] = await trx('grades').where({ id: existing.id }).update(data).returning('*');
        results.push(row);
      } else {
        const [row] = await trx('grades').insert(data).returning('*');
        results.push(row);
      }
    }
    return results;
  });

  await notifyGradesPosted(tenantId, exam, rows);

  return rows;
}

async function notifyGradesPosted(tenantId, exam, rows) {
  try {
    if (!rows || rows.length === 0) return;
    const studentIds = rows.map((r) => r.student_id);
    const examName = exam?.name || 'exam';

    await broadcast.notifyUsers(tenantId, studentIds, {
      title: 'Grade Posted',
      message: `Your result for ${examName} has been posted.`,
      type: 'grade',
      refType: 'exam',
      refId: exam?.id,
    });

    const parentRows = await db('student_parents')
      .join('students', 'student_parents.student_id', 'students.id')
      .where({ 'student_parents.tenant_id': tenantId })
      .whereIn('students.user_id', studentIds)
      .select('student_parents.parent_id');

    await broadcast.notifyUsers(tenantId, parentRows.map((p) => p.parent_id), {
      title: 'Grade Posted',
      message: `A grade for your child has been posted for ${examName}.`,
      type: 'grade',
      refType: 'exam',
      refId: exam?.id,
    });
  } catch (err) {
    logger.error('Grade notification error', { error: err.message });
  }
}

async function getByExam(tenantId, examId) {
  const exam = await db('exams').where({ tenant_id: tenantId, id: examId }).first();
  if (!exam) return [];

  return db('students')
    .where({ 'students.tenant_id': tenantId, 'students.class_id': exam.class_id })
    .leftJoin('users', 'students.user_id', 'users.id')
    .leftJoin('grades', function () {
      this.on('grades.student_id', '=', 'users.id')
        .andOn('grades.exam_id', '=', db.raw('?', [examId]));
    })
    .select(
      'users.id as student_id',
      'users.first_name',
      'users.last_name',
      'users.email',
      'students.student_number',
      'grades.id as grade_id',
      'grades.marks_obtained',
      'grades.grade_letter',
      'grades.remarks',
      'grades.locked_by'
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
  await db.transaction(async (trx) => {
    if (lock) {
      const data = { locked_by: userId, locked_at: db.fn.now() };
      await trx('grades').where({ tenant_id: tenantId, exam_id: examId }).update(data);
      const existingLock = await trx('exams').where({ tenant_id: tenantId, id: examId }).first();
      if (existingLock) {
        await trx('exams').where({ id: existingLock.id }).update({ locked_by: userId, locked_at: db.fn.now() });
      }
    } else {
      await trx('grades').where({ tenant_id: tenantId, exam_id: examId }).update({ locked_by: null, locked_at: null });
      const existingLock = await trx('exams').where({ tenant_id: tenantId, id: examId }).first();
      if (existingLock) {
        await trx('exams').where({ id: existingLock.id }).update({ locked_by: null, locked_at: null });
      }
    }
  });
  return { locked: lock };
}

module.exports = { upsertGrades, getByExam, getByStudent, lockGrades, computeGradeLetter };
