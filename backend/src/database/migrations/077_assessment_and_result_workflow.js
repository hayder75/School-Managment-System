/**
 * Assessment types, result submissions (QA approval), grade edit requests,
 * grade history, server-side drafts, and exam archive/soft-delete.
 */

const DEFAULT_TYPES = [
  { code: 'quiz', name: 'Quiz', sort: 10, total: 10, pass: 5 },
  { code: 'test', name: 'Test', sort: 20, total: 20, pass: 10 },
  { code: 'classwork', name: 'Classwork', sort: 30, total: 10, pass: 5 },
  { code: 'homework', name: 'Homework', sort: 40, total: 10, pass: 5 },
  { code: 'assignment', name: 'Assignment', sort: 50, total: 20, pass: 10 },
  { code: 'project', name: 'Project', sort: 60, total: 20, pass: 10 },
  { code: 'midterm', name: 'Midterm', sort: 70, total: 50, pass: 25 },
  { code: 'final', name: 'Final', sort: 80, total: 50, pass: 25 },
  { code: 'exam', name: 'Exam', sort: 90, total: 100, pass: 50 },
];

const SYSTEM_CODES = new Set(DEFAULT_TYPES.map((t) => t.code));

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'type';
}

exports.up = async function up(knex) {
  // ── assessment types ──
  const hasTypes = await knex.schema.hasTable('assessment_types');
  if (!hasTypes) {
    await knex.schema.createTable('assessment_types', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('name', 80).notNullable();
      table.string('code', 50).notNullable();
      table.decimal('default_total_marks', 10, 2);
      table.decimal('default_pass_marks', 10, 2);
      table.boolean('counts_toward_report').defaultTo(true);
      table.integer('sort_order').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_system').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'code']);
      table.index('tenant_id');
    });
  }

  // ── exams: archive support ──
  if (!(await knex.schema.hasColumn('exams', 'archived_at'))) {
    await knex.schema.table('exams', (table) => {
      table.timestamp('archived_at');
      table.uuid('archived_by').references('id').inTable('users').onDelete('SET NULL');
    });
  }

  // ── grades: who last changed the mark ──
  if (!(await knex.schema.hasColumn('grades', 'updated_by'))) {
    await knex.schema.table('grades', (table) => {
      table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
    });
  }

  // ── result submissions: one per exam + class section ──
  if (!(await knex.schema.hasTable('result_submissions'))) {
    await knex.schema.createTable('result_submissions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('exam_id').notNullable().references('id').inTable('exams').onDelete('CASCADE');
      table.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
      table.uuid('subject_id').references('id').inTable('subjects').onDelete('SET NULL');
      table.uuid('teacher_id').references('id').inTable('users').onDelete('SET NULL');
      // draft | submitted | approved | returned
      table.string('status', 20).notNullable().defaultTo('draft');
      table.integer('total_students').defaultTo(0);
      table.integer('graded_count').defaultTo(0);
      table.timestamp('submitted_at');
      table.uuid('submitted_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('reviewed_at');
      table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
      table.text('review_comment');
      table.integer('version').defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'exam_id', 'class_id']);
      table.index(['tenant_id', 'status']);
      table.index(['tenant_id', 'teacher_id']);
    });
  }

  // ── review comment thread / decision log ──
  if (!(await knex.schema.hasTable('result_review_comments'))) {
    await knex.schema.createTable('result_review_comments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('submission_id').notNullable().references('id').inTable('result_submissions').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('action', 30);
      table.text('comment');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'submission_id']);
    });
  }

  // ── mark change history (for QA diff + audit) ──
  if (!(await knex.schema.hasTable('grade_history'))) {
    await knex.schema.createTable('grade_history', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('grade_id').references('id').inTable('grades').onDelete('SET NULL');
      table.uuid('exam_id').notNullable().references('id').inTable('exams').onDelete('CASCADE');
      table.uuid('student_id').notNullable();
      table.decimal('old_marks', 10, 2);
      table.decimal('new_marks', 10, 2);
      table.uuid('changed_by').references('id').inTable('users').onDelete('SET NULL');
      table.text('note');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'exam_id', 'student_id']);
    });
  }

  // ── teacher edit requests (student-level, dual approval) ──
  if (!(await knex.schema.hasTable('grade_edit_requests'))) {
    await knex.schema.createTable('grade_edit_requests', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('exam_id').notNullable().references('id').inTable('exams').onDelete('CASCADE');
      table.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
      table.uuid('student_id').references('id').inTable('users').onDelete('CASCADE');
      table.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      // student | section
      table.string('scope', 20).notNullable().defaultTo('student');
      table.text('reason').notNullable();
      // pending | partially_approved | approved | rejected | expired | used
      table.string('status', 24).notNullable().defaultTo('pending');
      table.uuid('owner_approved_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('owner_approved_at');
      table.text('owner_note');
      table.uuid('qa_approved_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('qa_approved_at');
      table.text('qa_note');
      table.uuid('rejected_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('rejected_at');
      table.text('reject_note');
      table.timestamp('expires_at');
      table.timestamp('used_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'status']);
      table.index(['tenant_id', 'exam_id', 'class_id']);
    });
  }

  // ── server-side autosave drafts ──
  if (!(await knex.schema.hasTable('grade_drafts'))) {
    await knex.schema.createTable('grade_drafts', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('exam_id').notNullable().references('id').inTable('exams').onDelete('CASCADE');
      table.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
      table.uuid('teacher_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.jsonb('payload').defaultTo('{}');
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'exam_id', 'class_id', 'teacher_id']);
    });
  }

  // ── seed assessment types per tenant ──
  const tenants = await knex('tenants').select('id');
  for (const tenant of tenants) {
    for (const t of DEFAULT_TYPES) {
      await knex('assessment_types')
        .insert({
          tenant_id: tenant.id,
          name: t.name,
          code: t.code,
          default_total_marks: t.total,
          default_pass_marks: t.pass,
          sort_order: t.sort,
          is_active: true,
          is_system: true,
        })
        .onConflict(['tenant_id', 'code'])
        .ignore();
    }

    // Keep any custom types already present on exams (e.g. "oral", "seminar").
    const used = await knex('exams').where({ tenant_id: tenant.id }).distinct('type').whereNotNull('type');
    let sort = 100;
    for (const row of used) {
      const code = slugify(row.type);
      if (SYSTEM_CODES.has(code)) continue;
      await knex('assessment_types')
        .insert({
          tenant_id: tenant.id,
          name: String(row.type).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          code,
          sort_order: sort,
          is_active: true,
          is_system: false,
        })
        .onConflict(['tenant_id', 'code'])
        .ignore();
      sort += 10;
    }
  }

  // ── backfill submission rows so existing exams keep working ──
  const grouped = await knex('grades')
    .join('exams', 'grades.exam_id', 'exams.id')
    .join('students', 'students.user_id', 'grades.student_id')
    .select('exams.tenant_id', 'exams.id as exam_id', 'exams.class_id', 'exams.class_ids', 'exams.subject_id', 'exams.locked_by', 'students.class_id as student_class')
    .groupBy('exams.tenant_id', 'exams.id', 'exams.class_id', 'exams.class_ids', 'exams.subject_id', 'exams.locked_by', 'students.class_id');

  const seen = new Set();
  for (const row of grouped) {
    const classId = row.student_class || row.class_id;
    if (!classId) continue;
    const key = `${row.exam_id}:${classId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const counts = await knex('grades')
      .join('students', 'students.user_id', 'grades.student_id')
      .where({ 'grades.exam_id': row.exam_id, 'students.class_id': classId })
      .count('* as total')
      .select(knex.raw('count(grades.marks_obtained) as graded'))
      .first();

    await knex('result_submissions')
      .insert({
        tenant_id: row.tenant_id,
        exam_id: row.exam_id,
        class_id: classId,
        subject_id: row.subject_id,
        status: row.locked_by ? 'approved' : 'draft',
        total_students: Number(counts?.total || 0),
        graded_count: Number(counts?.graded || 0),
        reviewed_by: row.locked_by || null,
        reviewed_at: row.locked_by ? knex.fn.now() : null,
      })
      .onConflict(['tenant_id', 'exam_id', 'class_id'])
      .ignore();
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('grade_drafts');
  await knex.schema.dropTableIfExists('grade_edit_requests');
  await knex.schema.dropTableIfExists('grade_history');
  await knex.schema.dropTableIfExists('result_review_comments');
  await knex.schema.dropTableIfExists('result_submissions');
  await knex.schema.dropTableIfExists('assessment_types');

  if (await knex.schema.hasColumn('grades', 'updated_by')) {
    await knex.schema.table('grades', (table) => table.dropColumn('updated_by'));
  }
  if (await knex.schema.hasColumn('exams', 'archived_at')) {
    await knex.schema.table('exams', (table) => {
      table.dropColumn('archived_at');
      table.dropColumn('archived_by');
    });
  }
};
