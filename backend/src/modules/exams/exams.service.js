const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');
const broadcast = require('../../socket/broadcast');
const logger = require('../../config/logger');
const timetable = require('../timetable/timetable.service');
const grading = require('../../shared/grading');
const assessmentTypes = require('../assessment-types/assessment-types.service');

const MAX_TOTAL_PER_SUBJECT = 100; // raw mode: each class + subject is marked out of 100 per term

function examClassIds(exam) {
  if (!exam) return [];
  const ids = Array.isArray(exam.class_ids) ? exam.class_ids.filter(Boolean) : [];
  if (ids.length) return ids;
  return exam.class_id ? [exam.class_id] : [];
}

async function resolveType(tenantId, type) {
  const code = assessmentTypes.slugify(type || 'exam');
  const row = await assessmentTypes.findByCode(tenantId, code);
  if (row) return row;
  // Unknown legacy value: keep it rather than silently rewriting history.
  return {
    code: type || 'exam',
    name: type || 'exam',
    default_total_marks: null,
    default_pass_marks: null,
  };
}

// Throw EXAM_TOTAL_EXCEEDS_100 when raw-mode totals would go above 100 for a
// class+subject (only enforced in `raw` mode).
async function assertWithinBudget(tenantId, { classIds, subjectId, termId, newTotal, excludeId }) {
  if (!subjectId) {
    const e = new Error('SUBJECT_REQUIRED');
    e.code = 'SUBJECT_REQUIRED';
    throw e;
  }
  for (const cid of classIds || []) {
    let q = db('exams').where({ tenant_id: tenantId, class_id: cid, subject_id: subjectId }).whereNull('archived_at');
    if (termId) q = q.where({ term_id: termId });
    if (excludeId) q = q.whereNot({ id: excludeId });
    const used = await q.sum('total_marks as v').first();
    const usedTotal = Number(used?.v || 0);
    if (usedTotal + Number(newTotal || 0) > MAX_TOTAL_PER_SUBJECT) {
      const e = new Error(`This subject is marked out of 100. Used ${usedTotal} of 100 — adding ${newTotal} would exceed it.`);
      e.code = 'EXAM_TOTAL_EXCEEDS_100';
      e.used = usedTotal;
      throw e;
    }
  }
}

function assertPassWithinTotal(totalMarks, passMarks) {
  if (passMarks != null && totalMarks != null && Number(passMarks) > Number(totalMarks)) {
    const e = new Error('PASS_EXCEEDS_TOTAL');
    e.code = 'PASS_EXCEEDS_TOTAL';
    e.total = Number(totalMarks);
    e.pass = Number(passMarks);
    throw e;
  }
}

async function create(tenantId, data, actorId = null) {
  const classIds = data.class_ids && data.class_ids.length
    ? data.class_ids
    : (data.class_id ? [data.class_id] : []);
  const primaryClassId = classIds[0] || null;

  const type = await resolveType(tenantId, data.type);
  const totalMarks = data.total_marks != null ? Number(data.total_marks) : (type.default_total_marks != null ? Number(type.default_total_marks) : null);
  const passMarks = data.pass_marks != null ? Number(data.pass_marks) : (type.default_pass_marks != null ? Number(type.default_pass_marks) : null);

  assertPassWithinTotal(totalMarks, passMarks);

  const scheme = await grading.getScheme(tenantId);
  if (scheme.mode !== 'weighted') {
    await assertWithinBudget(tenantId, {
      classIds,
      subjectId: data.subject_id,
      termId: data.term_id,
      newTotal: totalMarks,
    });
  }

  const [exam] = await db('exams').insert({
    name: data.name,
    type: type.code,
    class_id: primaryClassId,
    class_ids: classIds.length ? JSON.stringify(classIds) : null,
    subject_id: data.subject_id,
    term_id: data.term_id,
    date: data.date,
    total_marks: totalMarks,
    pass_marks: passMarks,
    description: data.description,
    tenant_id: tenantId,
  }).returning('*');

  // Seed a draft submission per section so the teacher sees a status chip
  // immediately.
  for (const cid of classIds) {
    await db('result_submissions')
      .insert({
        tenant_id: tenantId,
        exam_id: exam.id,
        class_id: cid,
        subject_id: exam.subject_id,
        teacher_id: actorId || null,
        status: 'draft',
      })
      .onConflict(['tenant_id', 'exam_id', 'class_id'])
      .ignore();
  }

  await notifyExamCreated(tenantId, exam, actorId, classIds);

  if (data.mark_test_day && primaryClassId && data.subject_id && data.date) {
    try {
      await timetable.markTestDay(tenantId, {
        class_id: primaryClassId,
        subject_id: data.subject_id,
        date: data.date,
        teacherId: actorId,
      });
    } catch (err) {
      logger.error('markTestDay failed', { error: err.message });
    }
  }

  return exam;
}

async function notifyExamCreated(tenantId, exam, actorId, classIds = []) {
  try {
    const ids = classIds.length ? classIds : (exam.class_id ? [exam.class_id] : []);
    if (ids.length === 0) return;

    let studentRows = [];
    let teacherRows = [];
    let parentRows = [];
    for (const cid of ids) {
      const s = await db('students').where({ tenant_id: tenantId, class_id: cid }).select('user_id');
      studentRows.push(...s.map((x) => x.user_id));
      const t = await db('teacher_subjects')
        .where({ tenant_id: tenantId, class_id: cid, subject_id: exam.subject_id })
        .select('teacher_id');
      teacherRows.push(...t.map((x) => x.teacher_id));
      const p = await db('student_parents')
        .join('students', 'student_parents.student_id', 'students.id')
        .where({ 'student_parents.tenant_id': tenantId, 'students.class_id': cid })
        .select('student_parents.parent_id');
      parentRows.push(...p.map((x) => x.parent_id));
    }

    const recipients = [...new Set(studentRows), ...new Set(teacherRows)].filter((id) => id && id !== actorId);
    await broadcast.notifyUsers(tenantId, recipients, {
      title: 'New Exam Scheduled',
      message: `${exam.name || 'An exam'} has been scheduled on ${exam.date || 'a new date'}.`,
      type: 'exam',
      refType: 'exam',
      refId: exam.id,
    });

    await broadcast.notifyUsers(tenantId, [...new Set(parentRows)], {
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

async function findAll(tenantId, { page = 1, limit = 20, class_id, subject_id, type, include_archived } = {}) {
  let query = db('exams')
    .where({ 'exams.tenant_id': tenantId })
    .modify((q) => { if (include_archived !== 'true' && include_archived !== true) q.whereNull('exams.archived_at'); })
    .leftJoin('classes', 'exams.class_id', 'classes.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select('exams.*', 'classes.name as class_name', 'subjects.name as subject_name')
    .orderBy('exams.date', 'desc');

  if (class_id) {
    query = query.where(function () {
      this.where('exams.class_id', class_id)
        .orWhereRaw('exams.class_ids @> ?::jsonb', [JSON.stringify([class_id])]);
    });
  }
  if (subject_id) query = query.where('exams.subject_id', subject_id);
  if (type) query = query.where('exams.type', type);

  return paginatedResult(query, page, limit);
}

async function findAllForTeacher(tenantId, { page = 1, limit = 20, class_id, subject_id, type, include_archived, teacherId } = {}) {
  const pairs = await db('teacher_subjects')
    .where({ tenant_id: tenantId, teacher_id: teacherId })
    .select('class_id', 'subject_id');
  if (!pairs.length) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };

  let query = db('exams')
    .where({ 'exams.tenant_id': tenantId })
    .modify((q) => { if (include_archived !== 'true' && include_archived !== true) q.whereNull('exams.archived_at'); })
    .where(function () {
      for (const p of pairs) {
        this.orWhere(function () {
          this.where('exams.subject_id', p.subject_id)
            .andWhere(function () {
              this.where('exams.class_id', p.class_id)
                .orWhereRaw('exams.class_ids @> ?::jsonb', [JSON.stringify([p.class_id])]);
            });
        });
      }
    })
    .leftJoin('classes', 'exams.class_id', 'classes.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select('exams.*', 'classes.name as class_name', 'subjects.name as subject_name')
    .orderBy('exams.date', 'desc');

  if (class_id) {
    query = query.where(function () {
      this.where('exams.class_id', class_id)
        .orWhereRaw('exams.class_ids @> ?::jsonb', [JSON.stringify([class_id])]);
    });
  }
  if (subject_id) query = query.where('exams.subject_id', subject_id);
  if (type) query = query.where('exams.type', type);

  return paginatedResult(query, page, limit);
}

async function findAllForStudentUserIds(tenantId, { page = 1, limit = 20, subject_id, studentUserIds, requestedClassId } = {}) {
  const classIds = await db('students')
    .where({ tenant_id: tenantId })
    .whereIn('user_id', studentUserIds)
    .pluck('class_id');
  const uniqueClassIds = [...new Set(classIds.filter(Boolean))];
  if (!uniqueClassIds.length) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };

  let query = db('exams')
    .where({ 'exams.tenant_id': tenantId })
    .whereNull('exams.archived_at')
    .where(function () {
      for (const cid of uniqueClassIds) {
        this.orWhere('exams.class_id', cid)
          .orWhereRaw('exams.class_ids @> ?::jsonb', [JSON.stringify([cid])]);
      }
    })
    .leftJoin('classes', 'exams.class_id', 'classes.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select('exams.*', 'classes.name as class_name', 'subjects.name as subject_name')
    .orderBy('exams.date', 'desc');

  if (requestedClassId) {
    query = query.where(function () {
      this.where('exams.class_id', requestedClassId)
        .orWhereRaw('exams.class_ids @> ?::jsonb', [JSON.stringify([requestedClassId])]);
    });
  }
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

/**
 * Full admin edit with safety rails once marks exist.
 * Returns { exam, warnings }.
 */
async function update(tenantId, id, data) {
  const existing = await db('exams').where({ tenant_id: tenantId, id }).first();
  if (!existing) return undefined;

  const existingClassIds = examClassIds(existing);
  const nextClassIds = data.class_ids?.length
    ? [...new Set(data.class_ids)]
    : (data.class_id ? [data.class_id] : existingClassIds);
  const subjectId = data.subject_id ?? existing.subject_id;
  const totalMarks = data.total_marks !== undefined ? Number(data.total_marks) : (existing.total_marks != null ? Number(existing.total_marks) : null);
  const passMarks = data.pass_marks !== undefined ? Number(data.pass_marks) : (existing.pass_marks != null ? Number(existing.pass_marks) : null);

  assertPassWithinTotal(totalMarks, passMarks);

  const graded = await db('grades')
    .join('students', 'students.user_id', 'grades.student_id')
    .where({ 'grades.tenant_id': tenantId, 'grades.exam_id': id })
    .whereNotNull('grades.marks_obtained')
    .select('students.class_id')
    .count('* as c')
    .groupBy('students.class_id');

  if (graded.length) {
    const gradedClassIds = new Set(graded.map((g) => g.class_id));
    const removedWithGrades = [...gradedClassIds].filter((cid) => !nextClassIds.includes(cid));
    if (removedWithGrades.length) {
      const e = new Error('CLASS_HAS_GRADES');
      e.code = 'CLASS_HAS_GRADES';
      e.class_ids = removedWithGrades;
      throw e;
    }
    if (String(subjectId) !== String(existing.subject_id)) {
      const e = new Error('SUBJECT_HAS_GRADES');
      e.code = 'SUBJECT_HAS_GRADES';
      throw e;
    }
    const highest = await db('grades')
      .where({ tenant_id: tenantId, exam_id: id })
      .whereNotNull('marks_obtained')
      .max('marks_obtained as v')
      .first();
    const maxMark = Number(highest?.v || 0);
    if (totalMarks != null && maxMark > totalMarks) {
      const e = new Error('TOTAL_BELOW_ENTERED_MARKS');
      e.code = 'TOTAL_BELOW_ENTERED_MARKS';
      e.highest = maxMark;
      throw e;
    }
  }

  const scheme = await grading.getScheme(tenantId);
  if (scheme.mode !== 'weighted' && (totalMarks !== Number(existing.total_marks) || nextClassIds.join() !== existingClassIds.join())) {
    await assertWithinBudget(tenantId, {
      classIds: nextClassIds,
      subjectId,
      termId: data.term_id ?? existing.term_id,
      newTotal: totalMarks,
      excludeId: id,
    });
  }

  const patch = { updated_at: db.fn.now() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.date !== undefined) patch.date = data.date;
  if (data.type !== undefined) {
    const type = await resolveType(tenantId, data.type);
    patch.type = type.code;
  }
  if (data.subject_id !== undefined) patch.subject_id = data.subject_id;
  if (data.term_id !== undefined) patch.term_id = data.term_id;
  if (data.total_marks !== undefined) patch.total_marks = totalMarks;
  if (data.pass_marks !== undefined) patch.pass_marks = passMarks;
  if (data.description !== undefined) patch.description = data.description;
  if (data.class_id !== undefined || data.class_ids !== undefined) {
    patch.class_id = nextClassIds[0] || null;
    patch.class_ids = nextClassIds.length ? JSON.stringify(nextClassIds) : null;
  }

  const [exam] = await db('exams').where({ tenant_id: tenantId, id }).update(patch).returning('*');

  // Keep section rows in sync when classes are added/removed.
  for (const cid of nextClassIds) {
    await db('result_submissions')
      .insert({
        tenant_id: tenantId,
        exam_id: exam.id,
        class_id: cid,
        subject_id: exam.subject_id,
        status: 'draft',
      })
      .onConflict(['tenant_id', 'exam_id', 'class_id'])
      .ignore();
  }
  const removed = existingClassIds.filter((cid) => !nextClassIds.includes(cid));
  if (removed.length) {
    await db('result_submissions')
      .where({ tenant_id: tenantId, exam_id: exam.id })
      .whereIn('class_id', removed)
      .where('status', 'draft')
      .del();
  }

  return exam;
}

async function archive(tenantId, id, userId) {
  const [exam] = await db('exams')
    .where({ tenant_id: tenantId, id })
    .update({ archived_at: db.fn.now(), archived_by: userId, updated_at: db.fn.now() })
    .returning('*');
  return exam;
}

async function restore(tenantId, id) {
  const [exam] = await db('exams')
    .where({ tenant_id: tenantId, id })
    .update({ archived_at: null, archived_by: null, updated_at: db.fn.now() })
    .returning('*');
  return exam;
}

async function remove(tenantId, id, { force = false } = {}) {
  const gradeCount = await db('grades')
    .where({ tenant_id: tenantId, exam_id: id })
    .count('* as count')
    .first();
  const grades = parseInt(gradeCount?.count || 0, 10);

  if (grades > 0 && !force) {
    const err = new Error('EXAM_HAS_GRADES');
    err.code = 'EXAM_HAS_GRADES';
    err.grades = grades;
    throw err;
  }

  if (force) {
    await db.transaction(async (trx) => {
      await trx('result_review_comments')
        .where({ tenant_id: tenantId })
        .whereIn('submission_id', trx('result_submissions').where({ tenant_id: tenantId, exam_id: id }).select('id'))
        .del();
      await trx('result_submissions').where({ tenant_id: tenantId, exam_id: id }).del();
      await trx('grade_edit_requests').where({ tenant_id: tenantId, exam_id: id }).del();
      await trx('grade_history').where({ tenant_id: tenantId, exam_id: id }).del();
      await trx('grade_drafts').where({ tenant_id: tenantId, exam_id: id }).del();
      await trx('grades').where({ tenant_id: tenantId, exam_id: id }).del();
      await trx('exams').where({ tenant_id: tenantId, id }).del();
    });
    return { deleted: true, grades };
  }

  return db('exams').where({ tenant_id: tenantId, id }).del();
}

module.exports = {
  create, findAll, findAllForTeacher, findAllForStudentUserIds, studentInClass,
  findById, update, remove, archive, restore, examClassIds, assertPassWithinTotal, resolveType,
};
