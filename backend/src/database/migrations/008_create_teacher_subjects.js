exports.up = function (knex) {
  return knex.schema.createTable('teacher_subjects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('teacher_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('subject_id').notNullable().references('id').inTable('subjects').onDelete('CASCADE');
    table.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('CASCADE');
    table.boolean('is_primary').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['teacher_id', 'subject_id', 'class_id']);
    table.index('tenant_id');
    table.index('teacher_id');
    table.index('class_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('teacher_subjects');
};
