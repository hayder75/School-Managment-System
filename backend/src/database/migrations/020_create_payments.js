exports.up = function (knex) {
  return knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('student_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('fee_structure_id').references('id').inTable('fee_structures').onDelete('SET NULL');
    table.decimal('amount_paid', 12, 2).notNullable();
    table.decimal('balance', 12, 2).defaultTo(0);
    table.date('due_date');
    table.date('paid_date').defaultTo(knex.fn.now());
    table.string('status', 20).notNullable().defaultTo('paid');
    table.string('transaction_id', 255);
    table.string('payment_method', 50).defaultTo('cash');
    table.text('receipt_url');
    table.text('remarks');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('tenant_id');
    table.index('student_id');
    table.index('fee_structure_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('payments');
};
