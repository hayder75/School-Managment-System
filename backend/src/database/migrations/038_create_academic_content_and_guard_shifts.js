const { seedTenant } = require('../../modules/roles/roles.seed');

exports.up = async function up(knex) {
  await knex.schema
    .createTable('content_submissions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('teacher_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('type', 50).notNullable(); // test, exam, notes, lesson_plan, worksheet
      table.string('title', 255).notNullable();
      table.uuid('class_id').references('id').inTable('classes').onDelete('SET NULL');
      table.uuid('subject_id').references('id').inTable('subjects').onDelete('SET NULL');
      table.uuid('academic_year_id').references('id').inTable('academic_years').onDelete('SET NULL');
      table.uuid('term_id').references('id').inTable('terms').onDelete('SET NULL');
      table.integer('week_number');
      table.text('body');
      table.string('attachment_url', 500);
      table.string('answer_key_url', 500);
      table.string('status', 50).notNullable().defaultTo('draft'); // draft, submitted, needs_revision, approved, archived
      table.timestamp('submitted_at');
      table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('reviewed_at');
      table.text('review_comment');
      table.jsonb('rubric_scores'); // e.g. { alignment: 5, difficulty: 4, clarity: 5, answer_key: 5 }
      table.boolean('is_banked').defaultTo(false); // published to approved materials bank
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.index('tenant_id');
      table.index('teacher_id');
      table.index('status');
      table.index('type');
      table.index(['tenant_id', 'is_banked']);
    })
    .createTable('submission_comments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('submission_id').notNullable().references('id').inTable('content_submissions').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.text('comment').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('tenant_id');
      table.index('submission_id');
    })
    .createTable('guard_shifts', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('guard_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.date('shift_date').notNullable();
      table.string('shift_type', 50).notNullable(); // day, night
      table.string('post_location', 100).notNullable().defaultTo('Main Gate');
      table.string('status', 50).notNullable().defaultTo('scheduled'); // scheduled, on_duty, completed, absent
      table.uuid('assigned_by').references('id').inTable('users').onDelete('SET NULL');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.unique(['tenant_id', 'guard_user_id', 'shift_date', 'shift_type']);
      table.index('tenant_id');
      table.index('shift_date');
      table.index('guard_user_id');
    });

  // Re-seed all tenants with the updated permission catalog and default role bindings
  const tenants = await knex('tenants').select('id');
  for (const t of tenants) {
    await seedTenant(knex, t.id);
  }
};

exports.down = async function down(knex) {
  await knex.schema
    .dropTableIfExists('guard_shifts')
    .dropTableIfExists('submission_comments')
    .dropTableIfExists('content_submissions');
};
