exports.up = function (knex) {
  return knex.schema.createTable('students', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('student_number', 50);
    table.uuid('class_id').references('id').inTable('classes').onDelete('SET NULL');
    table.date('enrollment_date');
    table.string('status', 20).defaultTo('active');
    table.text('emergency_contact');
    table.jsonb('medical_info').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('tenant_id');
    table.index('class_id');
    table.index('user_id');
    table.unique(['tenant_id', 'student_number']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('students');
};
