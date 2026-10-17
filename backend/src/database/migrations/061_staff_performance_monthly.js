// Monthly staff performance: mark criteria that are computed automatically and
// store reviewer overrides for the monthly review.
exports.up = async function up(knex) {
  const hasAuto = await knex.schema.hasColumn('staff_performance_criteria', 'auto_source');
  if (!hasAuto) {
    await knex.schema.alterTable('staff_performance_criteria', (table) => {
      // null = manual. Otherwise: attendance_punctuality | attendance | punctuality | student_results
      table.string('auto_source', 40);
    });
  }

  // Map the seeded starter criteria to their automatic source so the system
  // computes them out of the box.
  await knex('staff_performance_criteria')
    .whereRaw("name ILIKE '%punctual%'")
    .update({ auto_source: 'attendance_punctuality' });
  await knex('staff_performance_criteria')
    .whereRaw("name ILIKE '%student result%'")
    .update({ auto_source: 'student_results' });

  if (!(await knex.schema.hasTable('staff_performance_overrides'))) {
    await knex.schema.createTable('staff_performance_overrides', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('staff_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('period', 7).notNullable(); // YYYY-MM
      table.uuid('criteria_id').notNullable().references('id').inTable('staff_performance_criteria').onDelete('CASCADE');
      table.decimal('value', 6, 2).notNullable();
      table.text('comment');
      table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'staff_user_id', 'period', 'criteria_id']);
      table.index(['tenant_id', 'period']);
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('staff_performance_overrides');
  const hasAuto = await knex.schema.hasColumn('staff_performance_criteria', 'auto_source');
  if (hasAuto) {
    await knex.schema.alterTable('staff_performance_criteria', (table) => {
      table.dropColumn('auto_source');
    });
  }
};
