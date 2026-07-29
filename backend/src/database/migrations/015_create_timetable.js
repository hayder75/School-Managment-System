exports.up = function (knex) {
  return knex.schema.createTable('timetable_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    table.uuid('subject_id').notNullable().references('id').inTable('subjects').onDelete('CASCADE');
    table.uuid('teacher_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('day_of_week', 20).notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.string('room', 50);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('tenant_id');
    table.index(['class_id', 'day_of_week']);
    table.index('teacher_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('timetable_entries');
};
