exports.up = async function up(knex) {
  // One monthly bill per student per Ethiopian month (snapshot of the amount).
  const hasBills = await knex.schema.hasTable('student_monthly_bills');
  if (!hasBills) {
    await knex.schema.createTable('student_monthly_bills', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.integer('period_year').notNullable();
      table.integer('period_month').notNullable(); // 1..13 (Ethiopian)
      table.decimal('amount', 12, 2).notNullable().defaultTo(0);
      table.decimal('penalty', 12, 2).notNullable().defaultTo(0);
      table.decimal('amount_paid', 12, 2).notNullable().defaultTo(0);
      table.string('status', 20).notNullable().defaultTo('unpaid'); // unpaid | paid
      table.timestamp('paid_date');
      table.uuid('paid_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'student_id', 'period_year', 'period_month']);
      table.index('tenant_id');
      table.index(['tenant_id', 'period_year', 'period_month']);
      table.index('student_id');
    });
  }

  // Tie a recorded payment to the month it covers.
  const hasPeriod = await knex.schema.hasColumn('payments', 'billing_period');
  if (!hasPeriod) {
    await knex.schema.alterTable('payments', (table) => {
      table.string('billing_period', 20); // e.g. "2019-01" (Ethiopian year-month)
      table.index('billing_period');
    });
  }
};

exports.down = async function down(knex) {
  const hasPeriod = await knex.schema.hasColumn('payments', 'billing_period');
  if (hasPeriod) {
    await knex.schema.alterTable('payments', (table) => {
      table.dropColumn('billing_period');
    });
  }
  await knex.schema.dropTableIfExists('student_monthly_bills');
};
