const db = require('../../config/database');
const broadcast = require('../../socket/broadcast');
const logger = require('../../config/logger');
const grading = require('../../shared/grading');
const editRequests = require('../edit-requests/edit-requests.service');

// Roles that can correct marks directly, without the teacher edit-request
// flow. Their change is final: a submitted section becomes approved.
const AUTHORITATIVE_ROLES = ['owner', 'admin', 'quality_director', 'principal', 'vice_principal', 'general_manager'];
const isAuthoritative = (role) => AUTHORITATIVE_ROLES.includes(role);

function computeGradeLetter(marks, total, scale) {
  if (marks == null || total == null || Number(total) <= 0) return null;
  const percent = (Number(marks) / Number(total)) * 100;
  const activeScale = Array.isArray(scale) && scale.length ? scale : grading.DEFAULT_SCALE;
  return grading.letterFor(activeScale, percent);
}

function examClassIds(exam) {
  const ids = Array.isArray(exam.class_ids) ? exam.class_ids.filter(Boolean) : [];
  if (ids.length) return ids;
  return exam.class_id ? [exam.class_id] : [];
}

async function submissionMap(tenantId, examId) {
  const rows = await db('result_submissions').where({ tenant_id: tenantId, exam_id: examId });
  return Object.fromEntries(rows.map((r) => [r.class_id, r]));
}

function isLockedStatus(status) {
  return ['submitted', 'approved'].includes(status);
}

async function upsertGrades(tenantId, examId, grades, userId, options = {}) {
  const { role = 'teacher' } = options;
  const exam = await db('exams').where({ tenant_id: tenantId, id: examId }).first();
  if (!exam) {
    const err = new Error('EXAM_NOT_FOUND');
    err.code = 'EXAM_NOT_FOUND';
    throw err;
  }

  if (exam.archived_at) {
    const err = new Error('EXAM_ARCHIVED');
    err.code = 'EXAM_ARCHIVED';
    throw err;
  }

  if (exam.locked_by && !isAuthoritative(role)) {
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

  const examClasses = examClassIds(exam);
  const classStudents = await db('students')
    .where({ tenant_id: tenantId })
    .whereIn('class_id', examClasses)
    .whereIn('user_id', grades.map((g) => g.student_id))
    .select('user_id', 'class_id');
  const studentClass = new Map(classStudents.map((s) => [s.user_id, s.class_id]));

  const submissions = await submissionMap(tenantId, examId);
  const { scale } = await grading.getGradingConfig(tenantId);
  const teacher = ['teacher', 'shift_coordinator'].includes(role);
  const authoritative = isAuthoritative(role);

  const saved = [];
  const skipped = [];

  await db.transaction(async (trx) => {
    for (const g of grades) {
      const classId = studentClass.get(g.student_id);
      if (!classId) {
        skipped.push({ student_id: g.student_id, reason: 'not_in_class' });
        continue;
      }

      const submission = submissions[classId];
      const status = submission?.status || 'draft';

      if (teacher && isLockedStatus(status)) {
        const grant = await editRequests.activeGrant(tenantId, examId, classId, g.student_id, userId);
        if (!grant) {
          skipped.push({ student_id: g.student_id, reason: 'locked', status });
          continue;
        }
      }

      const existing = await trx('grades')
        .where({ tenant_id: tenantId, exam_id: examId, student_id: g.student_id })
        .first();

      if (existing && existing.locked_by && !authoritative) {
        skipped.push({ student_id: g.student_id, reason: 'locked', status });
        continue;
      }

      const newMarks = g.marks_obtained ?? null;
      const data = {
        tenant_id: tenantId,
        exam_id: examId,
        student_id: g.student_id,
        marks_obtained: newMarks,
        grade_letter: computeGradeLetter(newMarks, totalMarks, scale) || g.grade_letter || null,
        remarks: g.remarks || null,
        updated_by: userId,
        updated_at: db.fn.now(),
      };

      let row;
      if (existing) {
        [row] = await trx('grades').where({ id: existing.id }).update(data).returning('*');
      } else {
        [row] = await trx('grades').insert(data).returning('*');
      }

      const oldMarks = existing?.marks_obtained == null ? null : Number(existing.marks_obtained);
      const nextMarks = newMarks == null ? null : Number(newMarks);
      if (oldMarks !== nextMarks) {
        await trx('grade_history').insert({
          tenant_id: tenantId,
          grade_id: row.id,
          exam_id: examId,
          student_id: g.student_id,
          old_marks: oldMarks,
          new_marks: nextMarks,
          changed_by: userId,
          note: existing ? 'mark updated' : 'mark entered',
        });
      }

      saved.push(row);
    }

    // Keep section counters fresh so QA sees real progress.
    const counts = await trx('grades')
      .join('students', 'students.user_id', 'grades.student_id')
      .where({ 'grades.tenant_id': tenantId, 'grades.exam_id': examId })
      .whereNotNull('grades.marks_obtained')
      .select('students.class_id')
      .count('* as c')
      .groupBy('students.class_id');
    for (const row of counts) {
      await trx('result_submissions')
        .where({ tenant_id: tenantId, exam_id: examId, class_id: row.class_id })
        .update({ graded_count: Number(row.c), updated_at: db.fn.now() });
    }
  });

  // An owner/admin/QA edit is final. If the section was waiting for approval,
  // mark it approved under their name instead of sending it back to the queue.
  if (authoritative) {
    const touched = new Set(
      saved
        .map((row) => studentClass.get(row.student_id))
        .filter(Boolean)
    );
    for (const classId of touched) {
      const sub = submissions[classId];
      if (sub && ['submitted', 'returned', 'editing'].includes(sub.status)) {
        await db('result_submissions')
          .where({ tenant_id: tenantId, id: sub.id })
          .update({
            status: 'approved',
            reviewed_by: userId,
            reviewed_at: db.fn.now(),
            review_comment: 'Updated directly by ' + role,
            updated_at: db.fn.now(),
          });
      }
    }
  }

  if (saved.length) await notifyGradesPosted(tenantId, exam, saved);

  return { saved, skipped };
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

async function allowedExamClassIds(tenantId, exam, userId, role) {
  const all = examClassIds(exam);
  if (!all.length) return [];
  if (role === 'teacher') {
    if (!userId || !exam.subject_id) return [];
    const rows = await db('teacher_subjects')
      .where({ tenant_id: tenantId, teacher_id: userId, subject_id: exam.subject_id })
      .whereIn('class_id', all)
      .select('class_id');
    const set = new Set(rows.map((r) => r.class_id));
    return all.filter((id) => set.has(id));
  }
  return all;
}

async function getExamClasses(tenantId, examId, { userId, role } = {}) {
  const exam = await db('exams').where({ tenant_id: tenantId, id: examId }).first();
  if (!exam) return [];
  const allowed = await allowedExamClassIds(tenantId, exam, userId, role);
  if (!allowed.length) return [];
  const rows = await db('classes')
    .where({ tenant_id: tenantId })
    .whereIn('id', allowed)
    .select('id', 'name', 'section', 'grade_level');
  const map = new Map(rows.map((r) => [r.id, r]));
  return allowed.map((id) => map.get(id)).filter(Boolean);
}

async function getByExam(tenantId, examId, { classId, userId, role } = {}) {
  const exam = await db('exams').where({ tenant_id: tenantId, id: examId }).first();
  if (!exam) return { rows: [], status: 'draft' };

  const allowed = await allowedExamClassIds(tenantId, exam, userId, role);
  if (!allowed.length) return { rows: [], status: 'draft' };
  const target = classId && allowed.includes(classId) ? classId : allowed[0];

  const submission = await db('result_submissions')
    .where({ tenant_id: tenantId, exam_id: examId, class_id: target })
    .first();
  const status = submission?.status || 'draft';

  // A parent may pass class_id only to disambiguate; they still only see their
  // own children, never the rest of the class.
  let childIds = null;
  if (role === 'parent') {
    const access = require('../../shared/access');
    childIds = await access.getChildrenUserIdsForParent(tenantId, userId);
    if (!childIds.length) return { rows: [], status };
  }

  let grants = [];
  if (role === 'teacher' && isLockedStatus(status)) {
    grants = await db('grade_edit_requests')
      .where({
        tenant_id: tenantId,
        exam_id: examId,
        class_id: target,
        requested_by: userId,
        status: 'approved',
      })
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', db.fn.now());
      })
      .select('student_id');
  }
  const grantAll = grants.some((g) => g.student_id === null);
  const grantSet = new Set(grants.map((g) => g.student_id).filter(Boolean));

  let query = db('students')
    .where({ 'students.tenant_id': tenantId, 'students.class_id': target })
    .leftJoin('users', 'students.user_id', 'users.id')
    .leftJoin('grades', function () {
      this.on('grades.student_id', '=', 'users.id')
        .andOn('grades.exam_id', '=', db.raw('?', [examId]));
    })
    .select(
      'users.id as student_id',
      'users.first_name',
      'users.middle_name',
      'users.last_name',
      'users.email',
      'students.student_number',
      'students.class_id',
      'grades.id as grade_id',
      'grades.marks_obtained',
      'grades.grade_letter',
      'grades.remarks',
      'grades.locked_by',
      'grades.updated_at'
    )
    .orderBy('users.first_name');

  if (childIds) query = query.whereIn('users.id', childIds);

  const rows = await query;

  const editableFor = (studentId) => {
    if (isAuthoritative(role)) return true;
    if (!isLockedStatus(status)) return true;
    if (role !== 'teacher') return false;
    return grantAll || grantSet.has(studentId);
  };

  return {
    rows: rows.map((r) => ({ ...r, editable: editableFor(r.student_id) })),
    status,
    submission,
    can_edit: rows.some((r) => editableFor(r.student_id)),
  };
}

async function getByStudent(tenantId, studentId, subjectIds) {
  let query = db('grades')
    .where({ 'grades.tenant_id': tenantId, 'grades.student_id': studentId })
    .leftJoin('exams', 'grades.exam_id', 'exams.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select(
      'grades.*',
      'exams.name as exam_name',
      'exams.type as exam_type',
      'exams.total_marks',
      'exams.pass_marks',
      'exams.date as exam_date',
      'subjects.name as subject_name'
    )
    .whereNull('exams.archived_at')
    .orderBy('exams.date', 'desc');

  if (Array.isArray(subjectIds)) {
    query = query.whereIn('exams.subject_id', subjectIds);
  }

  return query;
}

async function lockGrades(tenantId, examId, lock, userId) {
  await db.transaction(async (trx) => {
    if (lock) {
      const data = { locked_by: userId, locked_at: db.fn.now() };
      await trx('grades').where({ tenant_id: tenantId, exam_id: examId }).update(data);
      await trx('exams').where({ tenant_id: tenantId, id: examId }).update({ locked_by: userId, locked_at: db.fn.now() });
      await trx('result_submissions')
        .where({ tenant_id: tenantId, exam_id: examId })
        .whereIn('status', ['draft', 'submitted', 'returned'])
        .update({ status: 'approved', reviewed_by: userId, reviewed_at: db.fn.now() });
    } else {
      await trx('grades').where({ tenant_id: tenantId, exam_id: examId }).update({ locked_by: null, locked_at: null });
      await trx('exams').where({ tenant_id: tenantId, id: examId }).update({ locked_by: null, locked_at: null });
      await trx('result_submissions')
        .where({ tenant_id: tenantId, exam_id: examId })
        .whereIn('status', ['approved', 'submitted'])
        .update({ status: 'returned', reviewed_by: userId, reviewed_at: db.fn.now() });
    }
  });
  return { locked: lock };
}

async function saveDraft(tenantId, examId, classId, teacherId, payload) {
  const [row] = await db('grade_drafts')
    .insert({
      tenant_id: tenantId,
      exam_id: examId,
      class_id: classId,
      teacher_id: teacherId,
      payload: JSON.stringify(payload || {}),
      updated_at: db.fn.now(),
    })
    .onConflict(['tenant_id', 'exam_id', 'class_id', 'teacher_id'])
    .merge({ payload: JSON.stringify(payload || {}), updated_at: db.fn.now() })
    .returning('*');
  return row;
}

async function getDraft(tenantId, examId, classId, teacherId) {
  return db('grade_drafts')
    .where({ tenant_id: tenantId, exam_id: examId, class_id: classId, teacher_id: teacherId })
    .first();
}

async function clearDraft(tenantId, examId, classId, teacherId) {
  return db('grade_drafts')
    .where({ tenant_id: tenantId, exam_id: examId, class_id: classId, teacher_id: teacherId })
    .del();
}

module.exports = {
  AUTHORITATIVE_ROLES, isAuthoritative,
  upsertGrades, getByExam, getExamClasses, getByStudent, lockGrades,
  computeGradeLetter, examClassIds, isLockedStatus,
  saveDraft, getDraft, clearDraft,
};
