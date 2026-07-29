exports.up = function (knex) {
  return knex.schema.createTable('student_parents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    table.uuid('parent_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('relationship', 50);
    table.boolean('is_primary').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['student_id', 'parent_id']);
    table.index('tenant_id');
    table.index('parent_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('student_parents');
};
