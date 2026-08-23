exports.up = async function up(knex) {
  await knex.schema
    .createTable('security_incidents', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('title', 255).notNullable();
      table.string('severity', 20).notNullable().defaultTo('low');
      table.string('location', 255);
      table.text('description').notNullable();
      table.string('action_taken', 500);
      table.string('status', 30).defaultTo('open');
      table.uuid('reported_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
    })
    .createTable('purchase_requests', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('item_name', 255).notNullable();
      table.integer('quantity').notNullable().defaultTo(1);
      table.decimal('estimated_cost', 12, 2).defaultTo(0);
      table.text('justification');
      table.string('status', 50).defaultTo('pending');
      table.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('approved_at');
      table.string('approval_note', 500);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
    });

  const hasSanction = await knex.schema.hasColumn('student_discipline', 'sanction');
  if (!hasSanction) {
    await knex.schema.table('student_discipline', (table) => {
      table.string('sanction', 100);
      table.text('outcome');
      table.date('hearing_date');
      table.boolean('parent_notified').defaultTo(false);
    });
  }

  const hasLocked = await knex.schema.hasColumn('payments', 'reconciliation_locked');
  if (!hasLocked) {
    await knex.schema.table('payments', (table) => {
      table.boolean('reconciliation_locked').defaultTo(false);
    });
  }

  for (const col of [
    ['approval_status', (t) => t.string('approval_status', 30).defaultTo('approved')],
    ['approved_by_gm', (t) => t.uuid('approved_by_gm').references('id').inTable('users').onDelete('SET NULL')],
    ['gm_approved_at', (t) => t.timestamp('gm_approved_at')],
    ['gm_note', (t) => t.text('gm_note')],
  ]) {
    if (!(await knex.schema.hasColumn('expenses', col[0]))) {
      await knex.schema.table('expenses', (table) => { col[1](table); });
    }
  }

  for (const col of [
    ['gm_approval_status', (t) => t.string('gm_approval_status', 30).defaultTo('pending')],
    ['gm_approved_by', (t) => t.uuid('gm_approved_by').references('id').inTable('users').onDelete('SET NULL')],
    ['gm_approved_at', (t) => t.timestamp('gm_approved_at')],
  ]) {
    if (!(await knex.schema.hasColumn('payroll', col[0]))) {
      await knex.schema.table('payroll', (table) => { col[1](table); });
    }
  }
};

async function dropColsIfExist(knex, table, cols) {
  for (const col of cols) {
    if (await knex.schema.hasColumn(table, col)) {
      await knex.schema.table(table, (t) => t.dropColumn(col));
    }
  }
}

exports.down = async function down(knex) {
  await dropColsIfExist(knex, 'payroll', ['gm_approval_status']);
  await dropColsIfExist(knex, 'expenses', ['approval_status', 'approved_by_gm', 'gm_note']);
  await dropColsIfExist(knex, 'payments', ['reconciliation_locked']);
  await dropColsIfExist(knex, 'student_discipline', ['sanction', 'outcome', 'hearing_date', 'parent_notified']);
  return knex.schema
    .dropTableIfExists('purchase_requests')
    .dropTableIfExists('security_incidents');
};
