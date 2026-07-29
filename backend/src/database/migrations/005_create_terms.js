exports.up = function (knex) {
  return knex.schema.createTable('terms', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('academic_year_id').notNullable().references('id').inTable('academic_years').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('tenant_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('terms');
};
