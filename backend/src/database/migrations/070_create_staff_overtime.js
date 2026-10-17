exports.up = function (knex) {
  return knex.schema.createTable('staff_overtime', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('staff_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('date').notNullable();
    table.decimal('hours', 6, 2).notNullable().defaultTo(0);
    table.string('overtime_type', 20).notNullable().defaultTo('day'); // day | night | rest_day | holiday
    table.decimal('multiplier', 5, 2).defaultTo(1.5);
    table.decimal('hourly_rate', 10, 2).defaultTo(0);
    table.decimal('amount', 12, 2).defaultTo(0);
    table.string('status', 20).notNullable().defaultTo('pending'); // pending | approved
    table.text('notes');
    table.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('tenant_id');
    table.index('staff_id');
    table.index('date');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('staff_overtime');
};