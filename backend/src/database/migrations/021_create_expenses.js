exports.up = function (knex) {
  return knex.schema.createTable('expenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('category', 100).notNullable();
    table.string('description', 500).notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.date('expense_date').defaultTo(knex.fn.now());
    table.string('paid_to', 255);
    table.text('receipt_url');
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('tenant_id');
    table.index('category');
    table.index('expense_date');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('expenses');
};
