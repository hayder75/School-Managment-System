exports.up = async function up(knex) {
  if (!(await knex.schema.hasTable('staff_performance_criteria'))) {
    await knex.schema.createTable('staff_performance_criteria', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.text('description');
      table.decimal('weight', 6, 2).notNullable().defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.integer('sort_order').notNullable().defaultTo(0);
      table.timestamps(true, true);
      table.index('tenant_id');
    });
  }

  if (!(await knex.schema.hasTable('staff_performance_scores'))) {
    await knex.schema.createTable('staff_performance_scores', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('staff_user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('staff_name', 200);
      table.string('job_title', 200);
      table.string('academic_year', 20); // e.g. 2017
      table.string('semester', 20); // 1 | 2
      table.decimal('score', 5, 2);
      table.text('remark');
      table.timestamps(true, true);
      table.index('tenant_id');
      table.index('staff_user_id');
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('staff_performance_scores');
  await knex.schema.dropTableIfExists('staff_performance_criteria');
};
