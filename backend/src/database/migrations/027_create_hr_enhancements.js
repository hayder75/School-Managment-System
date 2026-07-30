exports.up = function (knex) {
  return knex.schema
    .createTable('tax_brackets', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.decimal('min_salary', 12, 2).notNullable().defaultTo(0);
      table.decimal('max_salary', 12, 2);
      table.decimal('rate', 5, 2).notNullable();
      table.decimal('deduction', 12, 2).defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
    })
    .createTable('leaves', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('staff_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('leave_type', 50).notNullable();
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.text('reason');
      table.string('status', 20).defaultTo('pending');
      table.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
      table.text('reject_reason');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('staff_id');
    })
    .createTable('payroll_audits', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('payroll_id').references('id').inTable('payroll').onDelete('CASCADE');
      table.string('action', 50).notNullable();
      table.uuid('performed_by').references('id').inTable('users').onDelete('SET NULL');
      table.jsonb('details').defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('payroll_id');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('payroll_audits')
    .dropTableIfExists('leaves')
    .dropTableIfExists('tax_brackets');
};
