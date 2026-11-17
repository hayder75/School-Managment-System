/**
 * Flexible assessment sheets.
 *
 * A template describes the columns of a subject/level mark list (groups +
 * weight%). A mark sheet is one class + subject + term instance of that
 * template. Every column is still backed by an exams row, so grades, history,
 * QA, reports and exports keep using the existing tables.
 */

exports.up = async function up(knex) {
  // ── subject flag: does this subject use listening/reading/writing/speaking? ──
  if (!(await knex.schema.hasColumn('subjects', 'has_language_skills'))) {
    await knex.schema.table('subjects', (table) => {
      table.boolean('has_language_skills').notNullable().defaultTo(false);
    });
  }

  // ── assessment templates ──
  if (!(await knex.schema.hasTable('assessment_templates'))) {
    await knex.schema.createTable('assessment_templates', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('level_group', 20); // nursery | kg | primary
      table.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE');
      table.uuid('term_id').references('id').inTable('terms').onDelete('CASCADE');
      table.string('name', 120).notNullable();
      table.jsonb('config').notNullable().defaultTo('{}');
      table.boolean('is_default').notNullable().defaultTo(false);
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index(['tenant_id', 'level_group', 'subject_id']);
      table.index(['tenant_id', 'subject_id']);
    });
    // One template per (tenant, level, subject, term), treating NULL as ''.
    await knex.raw(`
      CREATE UNIQUE INDEX assessment_templates_scope_unique
      ON assessment_templates (
        tenant_id,
        COALESCE(level_group, ''),
        COALESCE(subject_id::text, ''),
        COALESCE(term_id::text, '')
      )
    `);
  }

  // ── mark sheets ──
  if (!(await knex.schema.hasTable('mark_sheets'))) {
    await knex.schema.createTable('mark_sheets', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
      table.uuid('subject_id').notNullable().references('id').inTable('subjects').onDelete('CASCADE');
      table.uuid('term_id').notNullable().references('id').inTable('terms').onDelete('CASCADE');
      table.jsonb('config').notNullable().defaultTo('{}');
      table.string('status', 20).notNullable().defaultTo('draft');
      table.decimal('pass_pct', 5, 2).notNullable().defaultTo(50);
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.uuid('submitted_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('submitted_at');
      table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('reviewed_at');
      table.text('review_comment');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'class_id', 'subject_id', 'term_id']);
      table.index(['tenant_id', 'status']);
      table.index(['tenant_id', 'class_id']);
    });
  }

  // ── exams: link columns to a sheet and describe the component ──
  const examCols = {
    mark_sheet_id: (table) => table.uuid('mark_sheet_id').references('id').inTable('mark_sheets').onDelete('SET NULL'),
    component_code: (table) => table.string('component_code', 60),
    component_group: (table) => table.string('component_group', 40),
    weight_pct: (table) => table.decimal('weight_pct', 6, 2),
    sort_order: (table) => table.integer('sort_order').notNullable().defaultTo(0),
    is_sheet_component: (table) => table.boolean('is_sheet_component').notNullable().defaultTo(false),
    input_type: (table) => table.string('input_type', 10).notNullable().defaultTo('number'),
  };
  for (const [col, add] of Object.entries(examCols)) {
    if (!(await knex.schema.hasColumn('exams', col))) {
      await knex.schema.table('exams', add);
    }
  }
  await knex.raw('CREATE INDEX IF NOT EXISTS exams_mark_sheet_id_index ON exams (mark_sheet_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS exams_component_code_index ON exams (component_code)');

  // ── class support staff (homeroom backup) ──
  if (!(await knex.schema.hasTable('class_support_staff'))) {
    await knex.schema.createTable('class_support_staff', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.boolean('can_mark_attendance').notNullable().defaultTo(true);
      table.boolean('can_enter_marks').notNullable().defaultTo(true);
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['class_id', 'user_id']);
      table.index(['tenant_id', 'class_id']);
      table.index(['tenant_id', 'user_id']);
    });
  }

  // ── attendance provenance (manual / backfill / import / face) ──
  if (!(await knex.schema.hasColumn('attendance', 'source'))) {
    await knex.schema.table('attendance', (table) => {
      table.string('source', 20).notNullable().defaultTo('manual');
    });
  }

  // ── term kind (semester | quarter) ──
  if (!(await knex.schema.hasColumn('terms', 'period_type'))) {
    await knex.schema.table('terms', (table) => {
      table.string('period_type', 20).notNullable().defaultTo('semester');
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('class_support_staff');
  if (await knex.schema.hasTable('mark_sheets')) {
    await knex.schema.table('exams', (table) => {
      table.dropColumn('mark_sheet_id');
    });
    await knex.schema.dropTableIfExists('mark_sheets');
  }
  await knex.schema.dropTableIfExists('assessment_templates');
  for (const col of ['has_language_skills']) {
    if (await knex.schema.hasColumn('subjects', col)) {
      await knex.schema.table('subjects', (table) => table.dropColumn(col));
    }
  }
  for (const col of ['component_code', 'component_group', 'weight_pct', 'sort_order', 'is_sheet_component', 'input_type']) {
    if (await knex.schema.hasColumn('exams', col)) {
      await knex.schema.table('exams', (table) => table.dropColumn(col));
    }
  }
  if (await knex.schema.hasColumn('attendance', 'source')) {
    await knex.schema.table('attendance', (table) => table.dropColumn('source'));
  }
  if (await knex.schema.hasColumn('terms', 'period_type')) {
    await knex.schema.table('terms', (table) => table.dropColumn('period_type'));
  }
};
