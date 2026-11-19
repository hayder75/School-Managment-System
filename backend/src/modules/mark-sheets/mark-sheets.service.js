/**
 * Mark sheets: one class + subject + term, with flexible weighted columns.
 *
 * Every column is still an exams row and every cell is a grades row, so the
 * existing reports, history, QA and exports keep working.
 */

const db = require('../../config/database');
const assessment = require('../../shared/assessment');
const grading = require('../../shared/grading');
const gradeSvc = require('../grades/grades.service');
const logger = require('../../config/logger');

const AUTHORITATIVE = ['owner', 'admin', 'quality_director', 'principal', 'vice_principal', 'general_manager'];
const REVIEW_ROLES = ['owner', 'admin', 'quality_director', 'principal', 'vice_principal', 'general_manager'];
const LOCKED = ['submitted', 'approved'];

function isAuthoritative(role) {
  return AUTHORITATIVE.includes(role);
}

function isLocked(status) {
  return LOCKED.includes(status);
}

async function getContext(tenantId, { classId, subjectId, termId }) {
  const [cls, subject, term] = await Promise.all([
    db('classes').where({ tenant_id: tenantId, id: classId }).first(),
    db('subjects').where({ tenant_id: tenantId, id: subjectId }).first(),
    db('terms').where({ tenant_id: tenantId, id: termId }).first(),
  ]);
  if (!cls) throw Object.assign(new Error('CLASS_NOT_FOUND'), { code: 'CLASS_NOT_FOUND' });
  if (!subject) throw Object.assign(new Error('SUBJECT_NOT_FOUND'), { code: 'SUBJECT_NOT_FOUND' });
  if (!term) throw Object.assign(new Error('TERM_NOT_FOUND'), { code: 'TERM_NOT_FOUND' });
  return { cls, subject, term };
}

async function isSupportStaff(tenantId, userId, classId) {
  if (!userId) return false;
  const row = await db('class_support_staff')
    .where({ tenant_id: tenantId, user_id: userId, class_id: classId, can_enter_marks: true })
    .first();
  return !!row;
}

async function isSubjectTeacher(tenantId, userId, classId, subjectId) {
  if (!userId) return false;
  const row = await db('teacher_subjects')
    .where({ tenant_id: tenantId, teacher_id: userId, class_id: classId, subject_id: subjectId })
    .first();
  return !!row;
}

async function getOrCreateSheet(tenantId, { classId, subjectId, termId }, userId = null) {
  const ctx = await getContext(tenantId, { classId, subjectId, termId });
  let sheet = await db('mark_sheets')
    .where({ tenant_id: tenantId, class_id: classId, subject_id: subjectId, term_id: termId })
    .first();
  if (sheet) return { sheet, ctx };

  const template = await assessment.resolveTemplate(tenantId, {
    level_group: ctx.cls.level_group,
    subject_id: subjectId,
    term_id: termId,
  });
  [sheet] = await db('mark_sheets')
    .insert({
      tenant_id: tenantId,
      class_id: classId,
      subject_id: subjectId,
      term_id: termId,
      config: JSON.stringify(template.config),
      status: 'draft',
      pass_pct: template.config?.pass_pct ?? 50,
      created_by: userId,
    })
    .returning('*');
  return { sheet, ctx };
}

async function sheetExams(tenantId, sheet) {
  return db('exams')
    .where({
      tenant_id: tenantId,
      subject_id: sheet.subject_id,
      term_id: sheet.term_id,
    })
    .whereNull('archived_at')
    .where(function () {
      this.where('class_id', sheet.class_id)
        .orWhereRaw('class_ids @> ?::jsonb', [JSON.stringify([sheet.class_id])]);
    })
    .orderBy('sort_order')
    .orderBy('date')
    .orderBy('created_at');
}

function uniqueCode(code, used) {
  let base = code || 'item';
  let next = base;
  let i = 2;
  while (used.has(next)) { next = `${base}_${i}`; i += 1; }
  used.add(next);
  return next;
}

/**
 * Union of the config's planned columns and the exams that already exist.
 * Config columns without an exam are still shown so the teacher sees the
 * full template before typing.
 */
function buildColumns(config, exams) {
  const used = new Set();
  const columns = [];
  for (const group of config.groups || []) {
    for (const comp of group.components || []) {
      const code = uniqueCode(comp.code, used);
      const exam = exams.find((e) => e.component_code === comp.code && !used.has(`exam:${e.id}`));
      if (exam) used.add(`exam:${exam.id}`);
      columns.push({
        exam_id: exam?.id || null,
        code,
        source_code: comp.code,
        name: comp.name,
        group: group.code,
        group_name: group.name,
        group_weight: group.weight_pct,
        is_final: group.is_final,
        max_marks: exam?.total_marks != null ? Number(exam.total_marks) : Number(comp.max_marks ?? 100),
        input_type: comp.input_type === 'text' ? 'text' : 'number',
        sort_order: columns.length,
        pass_marks: exam?.pass_marks != null ? Number(exam.pass_marks) : null,
        type: exam?.type || null,
        date: exam?.date || null,
      });
    }
  }
  // Exams that do not match a planned component (legacy/ad-hoc) are appended
  // to their own group so their marks are never hidden.
  for (const e of exams) {
    if (used.has(`exam:${e.id}`)) continue;
    const code = uniqueCode(e.component_code || `item_${columns.length + 1}`, used);
    used.add(`exam:${e.id}`);
    columns.push({
      exam_id: e.id,
      code,
      source_code: e.component_code,
      name: e.name,
      group: e.component_group || assessment.groupForType(e.type),
      group_name: assessment.GROUP_NAMES[e.component_group] || e.component_group || 'Assessment',
      group_weight: e.weight_pct != null ? Number(e.weight_pct) : null,
      is_final: (e.component_group || assessment.groupForType(e.type)) === 'final',
      max_marks: e.total_marks != null ? Number(e.total_marks) : null,
      input_type: e.input_type === 'text' ? 'text' : 'number',
      sort_order: columns.length,
      pass_marks: e.pass_marks != null ? Number(e.pass_marks) : null,
      type: e.type,
      date: e.date,
    });
  }
  return columns;
}

async function getRoster(tenantId, classId) {
  return db('students as s')
    .join('users as u', 's.user_id', 'u.id')
    .where({ 's.tenant_id': tenantId, 's.class_id': classId, 's.status': 'active' })
    .select(
      'u.id as student_id',
      's.id as record_id',
      's.student_number',
      's.gender',
      'u.first_name',
      'u.middle_name',
      'u.last_name'
    )
    .orderBy('u.first_name')
    .orderBy('u.middle_name')
    .orderBy('u.last_name');
}

async function getCells(tenantId, exams, students) {
  const examIds = exams.map((e) => e.id);
  const ids = students.map((s) => s.student_id);
  if (!examIds.length || !ids.length) return { byStudent: {}, grades: [] };
  const rows = await db('grades')
    .where({ tenant_id: tenantId })
    .whereIn('exam_id', examIds)
    .whereIn('student_id', ids)
    .select('id', 'exam_id', 'student_id', 'marks_obtained', 'remarks', 'grade_letter', 'locked_by', 'updated_at');
  const examCode = new Map(exams.map((e) => [e.id, e.component_code]));
  const byStudent = {};
  for (const r of rows) {
    const code = examCode.get(r.exam_id);
    if (!code) continue;
    byStudent[r.student_id] = byStudent[r.student_id] || {};
    byStudent[r.student_id][code] = {
      grade_id: r.id,
      marks: r.marks_obtained == null ? null : Number(r.marks_obtained),
      text: r.remarks || '',
      letter: r.grade_letter,
      updated_at: r.updated_at,
    };
  }
  return { byStudent, grades: rows };
}

async function computeSheet(tenantId, sheet, ctx, columns, students, byStudent) {
  const { scale } = await grading.getGradingConfig(tenantId);
  const config = assessment.ensureGroups(sheet.config, columns);
  const passPct = Number(sheet.pass_pct ?? config.pass_pct ?? 50);
  const rows = students.map((s) => {
    const values = {};
    for (const c of columns) {
      values[c.code] = byStudent[s.student_id]?.[c.code] || null;
    }
    const result = assessment.computeStudent(config, columns, values, { scale, passPct });
    return {
      ...s,
      name: [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' '),
      values,
      ...result,
    };
  });
  rows.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  rows.forEach((r) => { r.no = rows.indexOf(r) + 1; });

  const withMarks = rows.filter((r) => r.percent != null);
  const complete = rows.filter((r) => r.complete);
  const average = withMarks.length
    ? Math.round((withMarks.reduce((s, r) => s + r.percent, 0) / withMarks.length) * 10) / 10
    : null;
  const passRate = withMarks.length
    ? Math.round((withMarks.filter((r) => r.passed).length / withMarks.length) * 100)
    : null;

  return {
    rows,
    config,
    summary: {
      students: rows.length,
      with_marks: withMarks.length,
      complete: complete.length,
      average,
      pass_rate: passRate,
      weight_total: assessment.weightTotal(config),
      male: students.filter((s) => String(s.gender || '').toLowerCase().startsWith('m')).length,
      female: students.filter((s) => String(s.gender || '').toLowerCase().startsWith('f')).length,
    },
  };
}

async function getSheetData(tenantId, { classId, subjectId, termId }, viewer = {}) {
  const { sheet, ctx } = await getOrCreateSheet(tenantId, { classId, subjectId, termId }, viewer.userId);
  const exams = await sheetExams(tenantId, sheet);
  const config = assessment.ensureGroups(sheet.config, []);
  const columns = buildColumns(config, exams);
  const students = await getRoster(tenantId, classId);
  const { byStudent } = await getCells(tenantId, exams, students);
  const computed = await computeSheet(tenantId, sheet, ctx, columns, students, byStudent);
  const { scale } = await grading.getGradingConfig(tenantId);

  const teacher = await db('teacher_subjects as ts')
    .join('users as u', 'ts.teacher_id', 'u.id')
    .where({ 'ts.tenant_id': tenantId, 'ts.class_id': classId, 'ts.subject_id': subjectId })
    .select('u.id', db.raw("CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) as name"))
    .first();

  const role = viewer.role;
  const authoritative = isAuthoritative(role);
  const readOnlyRole = role === 'Unit Leader';
  const assigned = ['teacher', 'support'].includes(role)
    ? ((await isSubjectTeacher(tenantId, viewer.userId, classId, subjectId))
      || (await isSupportStaff(tenantId, viewer.userId, classId)))
    : true;
  const locked = isLocked(sheet.status) && !authoritative;
  const canEdit = !readOnlyRole && assigned && !locked;
  const canReview = REVIEW_ROLES.includes(role) && sheet.status === 'submitted';

  return {
    sheet: {
      id: sheet.id,
      status: sheet.status,
      pass_pct: Number(sheet.pass_pct ?? 50),
      config: computed.config,
      submitted_at: sheet.submitted_at,
      reviewed_at: sheet.reviewed_at,
      review_comment: sheet.review_comment,
    },
    class: { id: ctx.cls.id, name: ctx.cls.name, level_group: ctx.cls.level_group, grade_level: ctx.cls.grade_level },
    subject: { id: ctx.subject.id, name: ctx.subject.name, has_language_skills: !!ctx.subject.has_language_skills },
    term: { id: ctx.term.id, name: ctx.term.name, period_type: ctx.term.period_type, start_date: ctx.term.start_date, end_date: ctx.term.end_date },
    columns,
    students: computed.rows,
    summary: computed.summary,
    teacher: teacher ? { id: teacher.id, name: teacher.name } : null,
    scale,
    permissions: { can_edit: canEdit, can_review: canReview, read_only: readOnlyRole, assigned },
  };
}

function examTypeForGroup(group) {
  if (group === 'final') return 'final';
  if (group === 'mid') return 'midterm';
  if (group === 'test') return 'test';
  if (group === 'skill') return 'reading_skill';
  if (group === 'ca') return 'classwork';
  return group || 'exam';
}

async function updateConfig(tenantId, sheetId, config, viewer = {}) {
  const sheet = await db('mark_sheets').where({ tenant_id: tenantId, id: sheetId }).first();
  if (!sheet) throw Object.assign(new Error('SHEET_NOT_FOUND'), { code: 'SHEET_NOT_FOUND' });
  if (['teacher', 'support'].includes(viewer.role) && isLocked(sheet.status)) {
    throw Object.assign(new Error('SHEET_LOCKED'), { code: 'SHEET_LOCKED' });
  }
  const clean = assessment.normaliseConfig(config);
  const total = assessment.weightTotal(clean);
  if (Math.abs(total - 100) > 0.1) {
    throw Object.assign(new Error('WEIGHTS_MUST_TOTAL_100'), { code: 'WEIGHTS_MUST_TOTAL_100', total });
  }
  const codes = new Set();
  for (const g of clean.groups) {
    for (const c of g.components) {
      if (codes.has(c.code)) {
        throw Object.assign(new Error('DUPLICATE_COMPONENT'), { code: 'DUPLICATE_COMPONENT', code_value: c.code });
      }
      codes.add(c.code);
    }
  }

  // Never let a column that already has marks disappear from the sheet.
  const previous = assessment.ensureGroups(sheet.config, []);
  const removed = [];
  for (const g of previous.groups) {
    for (const c of g.components) {
      if (!codes.has(c.code)) removed.push(c.code);
    }
  }
  if (removed.length) {
    const exams = await sheetExams(tenantId, sheet);
    const examIds = exams.filter((e) => removed.includes(e.component_code)).map((e) => e.id);
    if (examIds.length) {
      const withMarks = await db('grades')
        .where({ tenant_id: tenantId })
        .whereIn('exam_id', examIds)
        .whereNotNull('marks_obtained')
        .first();
      if (withMarks) {
        throw Object.assign(new Error('COMPONENT_HAS_MARKS'), { code: 'COMPONENT_HAS_MARKS', count: examIds.length });
      }
    }
  }

  const [row] = await db('mark_sheets')
    .where({ id: sheet.id })
    .update({ config: JSON.stringify(clean), updated_at: db.fn.now() })
    .returning('*');
  return row;
}

async function upsertCells(trx, tenantId, sheet, ctx, columns, cells, userId) {
  const students = await getRoster(tenantId, sheet.class_id);
  const studentIds = new Set(students.map((s) => s.student_id));
  const warnings = [];
  const saved = [];

  // Group cells by component.
  const byComponent = new Map();
  for (const cell of cells || []) {
    const code = cell.component_code;
    if (!code || !studentIds.has(cell.student_id)) {
      warnings.push({ student_id: cell.student_id, code, reason: 'not_in_class' });
      continue;
    }
    if (!byComponent.has(code)) byComponent.set(code, []);
    byComponent.get(code).push(cell);
  }

  for (const [code, list] of byComponent.entries()) {
    const column = columns.find((c) => c.code === code);
    if (!column) {
      warnings.push({ code, reason: 'unknown_component' });
      continue;
    }
    let exam = column.exam_id
      ? await trx('exams').where({ tenant_id: tenantId, id: column.exam_id }).first()
      : null;

    if (!exam) {
      const max = column.input_type === 'text' ? null : Number(column.max_marks ?? 100);
      [exam] = await trx('exams')
        .insert({
          tenant_id: tenantId,
          name: column.name,
          type: examTypeForGroup(column.group),
          class_id: sheet.class_id,
          class_ids: JSON.stringify([sheet.class_id]),
          subject_id: sheet.subject_id,
          term_id: sheet.term_id,
          total_marks: max,
          pass_marks: max ? Math.round(max * (Number(sheet.pass_pct ?? 50) / 100) * 100) / 100 : null,
          mark_sheet_id: sheet.id,
          component_code: code,
          component_group: column.group,
          weight_pct: column.group_weight,
          sort_order: column.sort_order,
          is_sheet_component: true,
          input_type: column.input_type,
        })
        .returning('*');
      column.exam_id = exam.id;
    }

    const max = exam.total_marks == null ? null : Number(exam.total_marks);
    for (const cell of list) {
      const isText = column.input_type === 'text';
      let marks = null;
      let text = null;
      if (isText) {
        text = cell.text == null ? '' : String(cell.text);
      } else {
        if (cell.marks === '' || cell.marks == null) continue;
        marks = Number(cell.marks);
        if (!Number.isFinite(marks)) {
          warnings.push({ student_id: cell.student_id, code, reason: 'not_a_number' });
          continue;
        }
        if (marks < 0 || (max != null && marks > max)) {
          warnings.push({ student_id: cell.student_id, code, reason: 'out_of_range', max });
          continue;
        }
      }
      const existing = await trx('grades')
        .where({ tenant_id: tenantId, exam_id: exam.id, student_id: cell.student_id })
        .first();
      const { scale } = await grading.getGradingConfig(tenantId);
      const gradeLetter = marks == null || max == null ? null : grading.letterFor(scale, (marks / max) * 100);
      const data = {
        tenant_id: tenantId,
        exam_id: exam.id,
        student_id: cell.student_id,
        marks_obtained: marks,
        grade_letter: gradeLetter,
        remarks: text,
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
      const nextMarks = marks == null ? null : Number(marks);
      if (oldMarks !== nextMarks || (existing?.remarks || '') !== (text || '')) {
        await trx('grade_history').insert({
          tenant_id: tenantId,
          grade_id: row.id,
          exam_id: exam.id,
          student_id: cell.student_id,
          old_marks: oldMarks,
          new_marks: nextMarks,
          changed_by: userId,
          note: existing ? 'mark updated' : 'mark entered',
        });
      }
      saved.push(row);
    }
  }

  // Refresh per-section counters for the existing QA pages.
  for (const exam of await sheetExams(tenantId, sheet)) {
    const counts = await trx('grades')
      .join('students', 'students.user_id', 'grades.student_id')
      .where({ 'grades.tenant_id': tenantId, 'grades.exam_id': exam.id })
      .whereNotNull('grades.marks_obtained')
      .select('students.class_id')
      .count('* as c')
      .groupBy('students.class_id');
    for (const row of counts) {
      const sub = await trx('result_submissions')
        .where({ tenant_id: tenantId, exam_id: exam.id, class_id: row.class_id })
        .first();
      if (sub) {
        await trx('result_submissions').where({ id: sub.id }).update({
          graded_count: Number(row.c),
          total_students: studentIds.size,
          updated_at: db.fn.now(),
        });
      }
    }
  }

  return { saved, warnings };
}

async function saveSheet(tenantId, sheetId, viewer, { cells = [], fillBlanks = false } = {}) {
  const sheet = await db('mark_sheets').where({ tenant_id: tenantId, id: sheetId }).first();
  if (!sheet) throw Object.assign(new Error('SHEET_NOT_FOUND'), { code: 'SHEET_NOT_FOUND' });
  const ctx = await getContext(tenantId, { classId: sheet.class_id, subjectId: sheet.subject_id, termId: sheet.term_id });

  const role = viewer.role;
  if (role === 'Unit Leader') {
    throw Object.assign(new Error('READ_ONLY'), { code: 'READ_ONLY' });
  }
  if (['teacher', 'support'].includes(role)) {
    const allowed = (await isSubjectTeacher(tenantId, viewer.userId, sheet.class_id, sheet.subject_id))
      || (await isSupportStaff(tenantId, viewer.userId, sheet.class_id));
    if (!allowed) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
    if (isLocked(sheet.status)) throw Object.assign(new Error('SHEET_LOCKED'), { code: 'SHEET_LOCKED' });
  }

  const exams = await sheetExams(tenantId, sheet);
  const config = assessment.ensureGroups(sheet.config, []);
  const columns = buildColumns(config, exams);

  // Fill blanks as zero only for components that already have marks somewhere.
  if (fillBlanks) {
    const students = await getRoster(tenantId, sheet.class_id);
    const byComponent = new Map();
    for (const c of cells) {
      if (!byComponent.has(c.component_code)) byComponent.set(c.component_code, new Set());
      byComponent.get(c.component_code).add(c.student_id);
    }
    const extra = [];
    for (const [code, ids] of byComponent.entries()) {
      const column = columns.find((c) => c.code === code);
      if (!column || column.input_type === 'text') continue;
      for (const s of students) {
        if (!ids.has(s.student_id)) extra.push({ student_id: s.student_id, component_code: code, marks: 0 });
      }
    }
    cells = cells.concat(extra);
  }

  let result;
  await db.transaction(async (trx) => {
    result = await upsertCells(trx, tenantId, sheet, ctx, columns, cells, viewer.userId);
  });
  await db('mark_sheets').where({ id: sheet.id }).update({ updated_at: db.fn.now() });
  return {
    saved: result.saved.length,
    warnings: result.warnings,
  };
}

async function sheetCompleteness(tenantId, sheetId) {
  const sheet = await db('mark_sheets').where({ tenant_id: tenantId, id: sheetId }).first();
  if (!sheet) return null;
  const exams = await sheetExams(tenantId, sheet);
  const config = assessment.ensureGroups(sheet.config, []);
  const columns = buildColumns(config, exams);
  const students = await getRoster(tenantId, sheet.class_id);
  const { byStudent } = await getCells(tenantId, exams, students);
  const computed = await computeSheet(tenantId, sheet, {}, columns, students, byStudent);
  return { sheet, columns, computed };
}

async function submitSheet(tenantId, sheetId, viewer) {
  const state = await sheetCompleteness(tenantId, sheetId);
  if (!state) throw Object.assign(new Error('SHEET_NOT_FOUND'), { code: 'SHEET_NOT_FOUND' });
  const { sheet, columns, computed } = state;
  if (isLocked(sheet.status)) throw Object.assign(new Error('ALREADY_SUBMITTED'), { code: 'ALREADY_SUBMITTED' });
  if (!columns.length) throw Object.assign(new Error('NO_COLUMNS'), { code: 'NO_COLUMNS' });
  if (!computed.summary.with_marks) throw Object.assign(new Error('NO_MARKS'), { code: 'NO_MARKS' });

  const incomplete = computed.rows.filter((r) => !r.complete);
  if (incomplete.length) {
    throw Object.assign(new Error('INCOMPLETE_SHEET'), {
      code: 'INCOMPLETE_SHEET',
      incomplete: incomplete.length,
      students: incomplete.slice(0, 5).map((r) => ({ student_id: r.student_id, name: r.name, missing: r.missing.map((m) => m.name) })),
    });
  }

  const exams = await sheetExams(tenantId, sheet);
  await db.transaction(async (trx) => {
    await trx('mark_sheets').where({ id: sheet.id }).update({
      status: 'submitted',
      submitted_by: viewer.userId,
      submitted_at: db.fn.now(),
      review_comment: null,
      updated_at: db.fn.now(),
    });
    for (const exam of exams) {
      const existing = await trx('result_submissions')
        .where({ tenant_id: tenantId, exam_id: exam.id, class_id: sheet.class_id })
        .first();
      const counts = await trx('grades')
        .join('students', 'students.user_id', 'grades.student_id')
        .where({ 'grades.tenant_id': tenantId, 'grades.exam_id': exam.id, 'students.class_id': sheet.class_id })
        .whereNotNull('grades.marks_obtained')
        .count('* as c')
        .first();
      const data = {
        tenant_id: tenantId,
        exam_id: exam.id,
        class_id: sheet.class_id,
        subject_id: sheet.subject_id,
        teacher_id: viewer.userId,
        status: 'submitted',
        submitted_at: db.fn.now(),
        submitted_by: viewer.userId,
        total_students: computed.summary.students,
        graded_count: Number(counts?.c || 0),
        updated_at: db.fn.now(),
      };
      if (existing) await trx('result_submissions').where({ id: existing.id }).update(data);
      else await trx('result_submissions').insert(data);
    }
  });
  return { status: 'submitted' };
}

async function reviewSheet(tenantId, sheetId, viewer, { decision, comment } = {}) {
  if (!REVIEW_ROLES.includes(viewer.role)) {
    throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
  }
  const sheet = await db('mark_sheets').where({ tenant_id: tenantId, id: sheetId }).first();
  if (!sheet) throw Object.assign(new Error('SHEET_NOT_FOUND'), { code: 'SHEET_NOT_FOUND' });
  if (sheet.status !== 'submitted') {
    throw Object.assign(new Error('NOT_SUBMITTED'), { code: 'NOT_SUBMITTED' });
  }
  const approve = decision === 'approve';
  if (!approve && !comment) {
    throw Object.assign(new Error('COMMENT_REQUIRED'), { code: 'COMMENT_REQUIRED' });
  }
  const status = approve ? 'approved' : 'returned';
  const exams = await sheetExams(tenantId, sheet);
  await db.transaction(async (trx) => {
    await trx('mark_sheets').where({ id: sheet.id }).update({
      status,
      reviewed_by: viewer.userId,
      reviewed_at: db.fn.now(),
      review_comment: comment || null,
      updated_at: db.fn.now(),
    });
    for (const exam of exams) {
      const sub = await trx('result_submissions')
        .where({ tenant_id: tenantId, exam_id: exam.id, class_id: sheet.class_id })
        .first();
      if (!sub) continue;
      await trx('result_submissions').where({ id: sub.id }).update({
        status,
        reviewed_by: viewer.userId,
        reviewed_at: db.fn.now(),
        review_comment: comment || null,
        updated_at: db.fn.now(),
      });
      await trx('result_review_comments').insert({
        tenant_id: tenantId,
        submission_id: sub.id,
        user_id: viewer.userId,
        action: status,
        comment: comment || null,
      });
    }
  });
  return { status };
}

async function listSubjectsForClass(tenantId, classId, viewer) {
  const rows = await db('teacher_subjects as ts')
    .join('subjects as s', 'ts.subject_id', 's.id')
    .where({ 'ts.tenant_id': tenantId, 'ts.class_id': classId })
    .select('s.id', 's.name', 's.has_language_skills', 'ts.teacher_id')
    .distinct();
  if (['teacher', 'support'].includes(viewer.role)) {
    const support = await isSupportStaff(tenantId, viewer.userId, classId);
    if (support) {
      // Support staff may fill any subject for their class.
      return rows;
    }
    return rows.filter((r) => r.teacher_id === viewer.userId);
  }
  return rows;
}

async function overview(tenantId, { termId } = {}, viewer = {}) {
  let classQuery = db('classes').where({ tenant_id: tenantId }).select('id', 'name', 'level_group', 'grade_level', 'class_teacher_id');
  if (['teacher', 'support'].includes(viewer.role)) {
    const assigned = await db('teacher_subjects').where({ tenant_id: tenantId, teacher_id: viewer.userId }).select('class_id');
    const support = await db('class_support_staff').where({ tenant_id: tenantId, user_id: viewer.userId }).select('class_id');
    const ids = [...new Set([...assigned.map((a) => a.class_id), ...support.map((s) => s.class_id)])];
    if (!ids.length) return { classes: [], term_id: termId || null };
    classQuery = classQuery.whereIn('id', ids);
  }
  const classes = await classQuery.orderBy('grade_level').orderBy('name');
  if (!classes.length) return { classes: [], term_id: termId || null };

  const classIds = classes.map((c) => c.id);
  const sheets = await db('mark_sheets')
    .where({ tenant_id: tenantId })
    .whereIn('class_id', classIds)
    .modify((q) => { if (termId) q.where('term_id', termId); })
    .select('id', 'class_id', 'subject_id', 'term_id', 'status');

  const subjects = await db('subjects').where({ tenant_id: tenantId }).select('id', 'name', 'has_language_skills');
  const subjectById = Object.fromEntries(subjects.map((s) => [s.id, s]));

  const assignments = await db('teacher_subjects')
    .where({ tenant_id: tenantId })
    .whereIn('class_id', classIds)
    .select('class_id', 'subject_id', 'teacher_id');
  const teachers = await db('users').where({ tenant_id: tenantId }).select('id', 'first_name', 'middle_name', 'last_name');
  const teacherById = Object.fromEntries(teachers.map((u) => [u.id, [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ')]));

  const studentCounts = await db('students')
    .where({ tenant_id: tenantId, status: 'active' })
    .whereIn('class_id', classIds)
    .select('class_id')
    .count('* as c')
    .groupBy('class_id');
  const countByClass = Object.fromEntries(studentCounts.map((r) => [r.class_id, Number(r.c)]));

  // One aggregate per sheet: how many students have at least one mark.
  const sheetIds = sheets.map((s) => s.id);
  let progress = {};
  if (sheetIds.length) {
    const rows = await db('exams')
      .join('grades', 'grades.exam_id', 'exams.id')
      .join('students', 'students.user_id', 'grades.student_id')
      .join('mark_sheets', 'exams.mark_sheet_id', 'mark_sheets.id')
      .where({ 'exams.tenant_id': tenantId })
      .whereIn('exams.mark_sheet_id', sheetIds)
      .whereColumn('students.class_id', 'mark_sheets.class_id')
      .select('exams.mark_sheet_id')
      .countDistinct('grades.student_id as c')
      .groupBy('exams.mark_sheet_id');
    progress = Object.fromEntries(rows.map((r) => [r.mark_sheet_id, Number(r.c)]));
  }

  const sheetByKey = Object.fromEntries(sheets.map((s) => [`${s.class_id}:${s.subject_id}`, s]));

  const supportClassIds = ['teacher', 'support'].includes(viewer.role)
    ? new Set((await db('class_support_staff').where({ tenant_id: tenantId, user_id: viewer.userId }).select('class_id')).map((r) => r.class_id))
    : null;

  const result = classes.map((c) => {
    const classSubjects = assignments.filter((a) => a.class_id === c.id);
    const unique = new Map();
    for (const a of classSubjects) unique.set(a.subject_id, a);
    // Include subjects that already have a sheet even if the teacher
    // assignment was removed.
    for (const s of sheets.filter((sh) => sh.class_id === c.id)) {
      if (!unique.has(s.subject_id)) unique.set(s.subject_id, { subject_id: s.subject_id, teacher_id: null });
    }
    const list = [...unique.values()]
      .filter((a) => {
        if (!['teacher', 'support'].includes(viewer.role)) return true;
        if (supportClassIds.has(c.id)) return true;
        return a.teacher_id === viewer.userId;
      })
      .map((a) => {
        const subject = subjectById[a.subject_id];
        if (!subject) return null;
        const sheet = sheetByKey[`${c.id}:${a.subject_id}`];
        return {
          subject_id: a.subject_id,
          name: subject.name,
          has_language_skills: !!subject.has_language_skills,
          teacher_name: teacherById[a.teacher_id] || null,
          sheet_id: sheet?.id || null,
          status: sheet?.status || 'not_started',
          entered: sheet ? (progress[sheet.id] || 0) : 0,
          students: countByClass[c.id] || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      id: c.id,
      name: c.name,
      level_group: c.level_group,
      grade_level: c.grade_level,
      homeroom_teacher: teacherById[c.class_teacher_id] || null,
      students: countByClass[c.id] || 0,
      subjects: list,
    };
  });

  return { classes: result, term_id: termId || null };
}

async function exportWorkbook(tenantId, sheetId, viewer) {
  const ExcelJS = require('exceljs');
  const sheet = await db('mark_sheets').where({ tenant_id: tenantId, id: sheetId }).first();
  if (!sheet) throw Object.assign(new Error('SHEET_NOT_FOUND'), { code: 'SHEET_NOT_FOUND' });
  const ctx = await getContext(tenantId, { classId: sheet.class_id, subjectId: sheet.subject_id, termId: sheet.term_id });
  const exams = await sheetExams(tenantId, sheet);
  const config = assessment.ensureGroups(sheet.config, []);
  const columns = buildColumns(config, exams);
  const students = await getRoster(tenantId, sheet.class_id);
  const { byStudent } = await getCells(tenantId, exams, students);
  const computed = await computeSheet(tenantId, sheet, ctx, columns, students, byStudent);
  const tenant = await db('tenants').where({ id: tenantId }).select('name').first();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Mark list', { views: [{ state: 'frozen', ySplit: 5, xSplit: 2 }] });
  ws.mergeCells(1, 1, 1, Math.max(columns.length + 5, 8));
  ws.getCell(1, 1).value = `${tenant?.name || 'School'} — ${ctx.term.name} Mark List`;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.getCell(2, 1).value = `Grade & Sec: ${ctx.cls.name}`;
  ws.getCell(2, 4).value = `Subject: ${ctx.subject.name}`;
  ws.getCell(3, 1).value = `No of Students: M ${computed.summary.male}  F ${computed.summary.female}  T ${computed.summary.students}`;
  ws.getCell(3, 4).value = `Term: ${ctx.term.name}`;

  const headerRow = 5;
  const groupStart = 3;
  ws.getCell(headerRow - 1, 1).value = 'No';
  ws.getCell(headerRow - 1, 2).value = 'Name of student';
  ws.mergeCells(headerRow - 1, 1, headerRow, 1);
  ws.mergeCells(headerRow - 1, 2, headerRow, 2);

  let col = groupStart;
  const groups = [];
  for (const group of config.groups) {
    const gcols = columns.filter((c) => c.group === group.code);
    if (!gcols.length) continue;
    const start = col;
    for (const c of gcols) {
      ws.getCell(headerRow, col).value = c.name;
      if (c.input_type === 'number' && c.max_marks != null) ws.getCell(headerRow + 1, col).value = `/${c.max_marks}`;
      col += 1;
    }
    if (col - 1 > start) ws.mergeCells(headerRow - 1, start, headerRow - 1, col - 1);
    ws.getCell(headerRow - 1, start).value = `${group.name} (${group.weight_pct}%)`;
    groups.push({ group, start, end: col - 1 });
  }
  const caCol = col; ws.getCell(headerRow - 1, caCol).value = 'Cont. Ass. Tot'; ws.mergeCells(headerRow - 1, caCol, headerRow, caCol); col += 1;
  const totalCol = col; ws.getCell(headerRow - 1, totalCol).value = '100%'; ws.mergeCells(headerRow - 1, totalCol, headerRow, totalCol); col += 1;
  const gradeCol = col; ws.getCell(headerRow - 1, gradeCol).value = 'Grade'; ws.mergeCells(headerRow - 1, gradeCol, headerRow, gradeCol); col += 1;
  const remarkCol = col; ws.getCell(headerRow - 1, remarkCol).value = 'Remark'; ws.mergeCells(headerRow - 1, remarkCol, headerRow + 1, remarkCol);

  ws.getRow(headerRow).font = { bold: true };
  ws.getRow(headerRow - 1).font = { bold: true };

  computed.rows.forEach((r, i) => {
    const row = ws.getRow(headerRow + 2 + i);
    row.getCell(1).value = i + 1;
    row.getCell(2).value = r.name;
    let c = groupStart;
    for (const gc of columns) {
      const v = r.values[gc.code];
      row.getCell(c).value = gc.input_type === 'text' ? (v?.text || '') : (v?.marks ?? '');
      c += 1;
    }
    row.getCell(caCol).value = r.ca_total;
    row.getCell(totalCol).value = r.percent;
    row.getCell(gradeCol).value = r.letter || '';
    row.getCell(remarkCol).value = r.values?.remark?.text || '';
  });

  ws.columns.forEach((column) => { column.width = 10; });
  ws.getColumn(2).width = 28;
  ws.getColumn(remarkCol).width = 24;
  return wb;
}


async function listTemplates(tenantId, { level_group, subject_id } = {}) {
  let q = db('assessment_templates').where({ tenant_id: tenantId });
  // When a specific level is selected, show that level's plan only. The global
  // fallback is visible under "All levels".
  if (level_group) q = q.where('level_group', level_group);
  if (subject_id) q = q.where(function () { this.whereNull('subject_id').orWhere('subject_id', subject_id); });
  const rows = await q.orderBy('name');
  return rows.map((r) => {
    let config = r.config;
    if (typeof config === 'string') { try { config = JSON.parse(config); } catch { config = {}; } }
    return { ...r, config: assessment.normaliseConfig(config) };
  });
}

async function saveTemplate(tenantId, userId, data = {}) {
  const clean = assessment.normaliseConfig(data.config);
  const total = assessment.weightTotal(clean);
  if (Math.abs(total - 100) > 0.1) {
    throw Object.assign(new Error('WEIGHTS_MUST_TOTAL_100'), { code: 'WEIGHTS_MUST_TOTAL_100', total });
  }
  const payload = {
    tenant_id: tenantId,
    level_group: data.level_group || null,
    subject_id: data.subject_id || null,
    term_id: data.term_id || null,
    name: String(data.name || 'Assessment plan').slice(0, 120),
    config: JSON.stringify(clean),
    is_default: !!data.is_default,
    updated_at: db.fn.now(),
  };
  if (data.id) {
    const [row] = await db('assessment_templates')
      .where({ tenant_id: tenantId, id: data.id })
      .update(payload)
      .returning('*');
    return row;
  }
  // One plan per (level, subject, term): editing the same scope updates it
  // instead of failing on the unique index.
  let existingQuery = db('assessment_templates').where({ tenant_id: tenantId });
  existingQuery = payload.level_group ? existingQuery.where('level_group', payload.level_group) : existingQuery.whereNull('level_group');
  existingQuery = payload.subject_id ? existingQuery.where('subject_id', payload.subject_id) : existingQuery.whereNull('subject_id');
  existingQuery = payload.term_id ? existingQuery.where('term_id', payload.term_id) : existingQuery.whereNull('term_id');
  const existing = await existingQuery.first();
  if (existing) {
    const [row] = await db('assessment_templates')
      .where({ id: existing.id })
      .update(payload)
      .returning('*');
    return row;
  }
  const [row] = await db('assessment_templates')
    .insert({ ...payload, created_by: userId })
    .returning('*');
  return row;
}

async function deleteTemplate(tenantId, id) {
  return db('assessment_templates').where({ tenant_id: tenantId, id }).del();
}


/**
 * Pre-compute every sheet in scope, keyed by class:subject:student.
 * Used by semester results / report cards so they never disagree with the
 * sheet the teacher filled.
 */
async function computeSubjectResults(tenantId, { classIds = [], termId } = {}) {
  const map = new Map();
  if (!classIds.length || !termId) return map;
  const sheets = await db('mark_sheets')
    .where({ tenant_id: tenantId, term_id: termId })
    .whereIn('class_id', classIds);
  if (!sheets.length) return map;
  const { scale } = await grading.getGradingConfig(tenantId);
  for (const sheet of sheets) {
    const exams = await sheetExams(tenantId, sheet);
    if (!exams.length) continue;
    const config = assessment.ensureGroups(sheet.config, []);
    const columns = buildColumns(config, exams);
    const students = await getRoster(tenantId, sheet.class_id);
    const { byStudent } = await getCells(tenantId, exams, students);
    const computed = await computeSheet(tenantId, sheet, {}, columns, students, byStudent);
    for (const row of computed.rows) {
      map.set(`${sheet.class_id}:${sheet.subject_id}:${row.student_id}`, row);
    }
  }
  return map;
}


/**
 * Keep the sheet status in sync when quality assurance decides on one of its
 * exams from the legacy per-exam Results page.
 */
async function syncSheetStatusFromExam(tenantId, examId) {
  const exam = await db('exams').where({ tenant_id: tenantId, id: examId }).select('mark_sheet_id').first();
  if (!exam?.mark_sheet_id) return;
  const exams = await db('exams').where({ tenant_id: tenantId, mark_sheet_id: exam.mark_sheet_id }).select('id');
  const ids = exams.map((e) => e.id);
  const subs = await db('result_submissions').where({ tenant_id: tenantId }).whereIn('exam_id', ids);
  if (!ids.length || subs.length < ids.length) return;
  const statuses = new Set(subs.map((s) => s.status));
  let status = 'draft';
  if ([...statuses].every((s) => s === 'approved')) status = 'approved';
  else if (statuses.has('returned')) status = 'returned';
  else if ([...statuses].every((s) => ['submitted', 'approved'].includes(s))) status = 'submitted';
  await db('mark_sheets').where({ tenant_id: tenantId, id: exam.mark_sheet_id }).update({
    status,
    updated_at: db.fn.now(),
  });
}


/**
 * Push a template's columns/weights onto existing sheets in its scope.
 * Marks are never touched. Existing columns are kept; only missing groups and
 * columns are added. Weights are re-balanced back to 100.
 */
async function applyTemplateToSheets(tenantId, templateId, { updateWeights = false, dryRun = false } = {}) {
  const template = await db('assessment_templates').where({ tenant_id: tenantId, id: templateId }).first();
  if (!template) throw Object.assign(new Error('TEMPLATE_NOT_FOUND'), { code: 'TEMPLATE_NOT_FOUND' });
  let tplConfig = template.config;
  if (typeof tplConfig === 'string') { try { tplConfig = JSON.parse(tplConfig); } catch { tplConfig = { groups: [] }; } }
  tplConfig = assessment.normaliseConfig(tplConfig);

  let q = db('mark_sheets as ms')
    .join('classes as c', 'ms.class_id', 'c.id')
    .where({ 'ms.tenant_id': tenantId })
    .select('ms.*', 'c.level_group');
  if (template.level_group) q = q.where('c.level_group', template.level_group);
  if (template.subject_id) q = q.where('ms.subject_id', template.subject_id);
  if (template.term_id) q = q.where('ms.term_id', template.term_id);
  const sheets = await q;
  if (dryRun) return { sheets: sheets.length, columns_added: 0, groups_added: 0 };

  let totalColumns = 0;
  let totalGroups = 0;
  for (const sheet of sheets) {
    let base = sheet.config;
    if (typeof base === 'string') { try { base = JSON.parse(base); } catch { base = { groups: [] }; } }
    base = assessment.normaliseConfig(base);
    const next = JSON.parse(JSON.stringify(base));
    const existingCodes = new Set(next.groups.flatMap((g) => (g.components || []).map((c) => c.code)));
    let columnsAdded = 0;
    let groupsAdded = 0;

    for (const tg of tplConfig.groups) {
      let group = next.groups.find((g) => g.code === tg.code);
      if (!group) {
        group = {
          code: tg.code,
          name: tg.name,
          weight_pct: Number(tg.weight_pct || 0),
          is_final: !!tg.is_final,
          components: [],
        };
        next.groups.push(group);
        groupsAdded += 1;
      } else if (updateWeights) {
        group.weight_pct = Number(tg.weight_pct || 0);
        if (tg.name) group.name = tg.name;
        group.is_final = !!tg.is_final;
      }
      for (const tc of tg.components || []) {
        if (existingCodes.has(tc.code)) continue;
        group.components = group.components || [];
        group.components.push({ ...tc });
        existingCodes.add(tc.code);
        columnsAdded += 1;
      }
    }

    if (!columnsAdded && !groupsAdded) continue;

    // Keep the plan at 100 after adding/updating groups.
    let total = next.groups.reduce((sum, g) => sum + Number(g.weight_pct || 0), 0);
    if (next.groups.length && Math.abs(total - 100) > 0.1) {
      if (total > 0) {
        next.groups.forEach((g) => {
          g.weight_pct = Math.round((Number(g.weight_pct || 0) * 100 / total) * 10) / 10;
        });
      }
      total = next.groups.reduce((sum, g) => sum + Number(g.weight_pct || 0), 0);
      next.groups[next.groups.length - 1].weight_pct = Math.round((next.groups[next.groups.length - 1].weight_pct + (100 - total)) * 10) / 10;
    }

    await db('mark_sheets').where({ id: sheet.id }).update({
      config: JSON.stringify(next),
      updated_at: db.fn.now(),
    });
    totalColumns += columnsAdded;
    totalGroups += groupsAdded;
  }

  return { sheets: sheets.length, columns_added: totalColumns, groups_added: totalGroups };
}

module.exports = {
  getOrCreateSheet,
  getSheetData,
  updateConfig,
  saveSheet,
  submitSheet,
  reviewSheet,
  overview,
  listSubjectsForClass,
  exportWorkbook,
  computeSubjectResults,
  syncSheetStatusFromExam,
  listTemplates,
  applyTemplateToSheets,
  saveTemplate,
  deleteTemplate,
  isSupportStaff,
  isSubjectTeacher,
  isAuthoritative,
  buildColumns,
  sheetExams,
};
