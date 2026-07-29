exports.up = function (knex) {
  return knex.schema.createTable('fee_structures', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.uuid('class_id').references('id').inTable('classes').onDelete('SET NULL');
    table.decimal('amount', 12, 2).notNullable();
    table.string('frequency', 50).notNullable().defaultTo('termly');
    table.date('due_date');
    table.decimal('late_fee', 10, 2).defaultTo(0);
    table.jsonb('applicable_to');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('tenant_id');
    table.index('class_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('fee_structures');
};
