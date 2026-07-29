exports.up = function (knex) {
  return knex.schema.createTable('exams', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('type', 50).notNullable().defaultTo('exam');
    table.uuid('class_id').references('id').inTable('classes').onDelete('CASCADE');
    table.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE');
    table.uuid('term_id').references('id').inTable('terms').onDelete('SET NULL');
    table.date('date');
    table.decimal('total_marks', 10, 2);
    table.decimal('pass_marks', 10, 2);
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('tenant_id');
    table.index(['class_id', 'subject_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('exams');
};
