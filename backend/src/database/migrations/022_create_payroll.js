exports.up = function (knex) {
  return knex.schema
    .createTable('salary_grades', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.decimal('basic_salary', 12, 2).notNullable();
      table.jsonb('allowances').defaultTo('{}');
      table.jsonb('deductions').defaultTo('{}');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
    })
    .createTable('payroll', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('salary_grade_id').references('id').inTable('salary_grades').onDelete('SET NULL');
      table.integer('month').notNullable();
      table.integer('year').notNullable();
      table.decimal('basic_pay', 12, 2).notNullable();
      table.decimal('allowances_total', 12, 2).defaultTo(0);
      table.decimal('deductions_total', 12, 2).defaultTo(0);
      table.decimal('net_pay', 12, 2).notNullable();
      table.string('status', 20).defaultTo('pending');
      table.date('paid_date');
      table.text('remarks');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'user_id', 'month', 'year']);
      table.index('tenant_id');
      table.index('user_id');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('payroll')
    .dropTableIfExists('salary_grades');
};
