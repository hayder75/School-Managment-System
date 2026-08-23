exports.up = async function up(knex) {
  await knex.schema
    .createTable('asset_assignments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('asset_id').notNullable().references('id').inTable('school_assets').onDelete('CASCADE');
      table.uuid('assigned_to').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('assigned_at').defaultTo(knex.fn.now());
      table.timestamp('unassigned_at');
      table.text('notes');
      table.uuid('recorded_by').references('id').inTable('users').onDelete('SET NULL');
      table.index('tenant_id');
      table.index('asset_id');
    });

  const hasCondition = await knex.schema.hasColumn('school_assets', 'condition');
  if (!hasCondition) {
    await knex.schema.table('school_assets', (table) => {
      table.string('condition', 20).defaultTo('Good');
      table.date('disposal_date');
      table.text('disposal_reason');
      table.string('disposal_method', 50);
      table.uuid('disposed_approved_by').references('id').inTable('users').onDelete('SET NULL');
    });
  }
};

exports.down = async function down(knex) {
  const hasCondition = await knex.schema.hasColumn('school_assets', 'condition');
  if (hasCondition) {
    await knex.schema.table('school_assets', (table) => {
      table.dropColumn('condition');
      table.dropColumn('disposal_date');
      table.dropColumn('disposal_reason');
      table.dropColumn('disposal_method');
      table.dropColumn('disposed_approved_by');
    });
  }
  return knex.schema.dropTableIfExists('asset_assignments');
};
