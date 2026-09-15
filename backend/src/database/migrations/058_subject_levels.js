exports.up = async function up(knex) {
  // Which levels/grades a subject applies to (subject <-> grade applicability).
  const has = await knex.schema.hasTable('subject_levels');
  if (!has) {
    await knex.schema.createTable('subject_levels', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('subject_id').notNullable().references('id').inTable('subjects').onDelete('CASCADE');
      table.string('level_group', 20); // nursery | kg | primary | secondary
      table.integer('grade_level'); // NULL = whole level_group
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['subject_id', 'level_group', 'grade_level']);
      table.index('tenant_id');
      table.index('subject_id');
    });
  }
};

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('subject_levels');
};
