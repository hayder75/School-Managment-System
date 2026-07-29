exports.up = function (knex) {
  return knex.schema.createTable('grades', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    table.uuid('exam_id').notNullable().references('id').inTable('exams').onDelete('CASCADE');
    table.decimal('marks_obtained', 10, 2);
    table.string('grade_letter', 5);
    table.text('remarks');
    table.uuid('locked_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('locked_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['student_id', 'exam_id']);
    table.index('tenant_id');
    table.index('exam_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('grades');
};
