exports.up = async function up(knex) {
  await knex.schema
    .createTable('payment_reconciliation_batches', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.date('batch_date').notNullable();
      table.uuid('reconciled_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('cashier_id').references('id').inTable('users').onDelete('SET NULL');
      table.decimal('total_cash', 12, 2).defaultTo(0);
      table.decimal('total_telebirr', 12, 2).defaultTo(0);
      table.decimal('total_cbe', 12, 2).defaultTo(0);
      table.decimal('total_other', 12, 2).defaultTo(0);
      table.decimal('total_amount', 12, 2).defaultTo(0);
      table.integer('transaction_count').defaultTo(0);
      table.string('status', 50).notNullable().defaultTo('reconciled_and_locked');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.index('tenant_id');
      table.index('batch_date');
      table.index('cashier_id');
    });

  // Alter payments table to support batch lock
  await knex.schema.alterTable('payments', (table) => {
    table.boolean('is_locked').defaultTo(false);
    table.uuid('reconciliation_batch_id').references('id').inTable('payment_reconciliation_batches').onDelete('SET NULL');
    table.index('is_locked');
  });

  // Alter payroll table to support GM executive sign-off
  await knex.schema.alterTable('payroll', (table) => {
    table.boolean('gm_approved').defaultTo(false);
    table.timestamp('gm_approved_at');
    table.uuid('gm_approved_by').references('id').inTable('users').onDelete('SET NULL');
  });

  // Alter expenses table to support GM high-value approval
  await knex.schema.alterTable('expenses', (table) => {
    table.boolean('requires_gm_approval').defaultTo(false);
    table.boolean('gm_approved').defaultTo(false);
    table.timestamp('gm_approved_at');
    table.uuid('gm_approved_by').references('id').inTable('users').onDelete('SET NULL');
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('expenses', (table) => {
    table.dropColumn('gm_approved_by');
    table.dropColumn('gm_approved_at');
    table.dropColumn('gm_approved');
    table.dropColumn('requires_gm_approval');
  });

  await knex.schema.alterTable('payroll', (table) => {
    table.dropColumn('gm_approved_by');
    table.dropColumn('gm_approved_at');
    table.dropColumn('gm_approved');
  });

  await knex.schema.alterTable('payments', (table) => {
    table.dropColumn('reconciliation_batch_id');
    table.dropColumn('is_locked');
  });

  await knex.schema.dropTableIfExists('payment_reconciliation_batches');
};
