exports.up = function (knex) {
  return knex.schema.createTable('attendance', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    table.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    table.date('date').notNullable();
    table.string('status', 20).notNullable().defaultTo('present');
    table.uuid('marked_by').references('id').inTable('users').onDelete('SET NULL');
    table.text('remark');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['student_id', 'class_id', 'date']);
    table.index(['tenant_id', 'class_id', 'date']);
    table.index(['tenant_id', 'student_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('attendance');
};
