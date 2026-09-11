exports.up = async function up(knex) {
  // Mandatory (billed to everyone) vs optional (only subscribed students).
  const hasMandatory = await knex.schema.hasColumn('fee_structures', 'is_mandatory');
  if (!hasMandatory) {
    await knex.schema.alterTable('fee_structures', (table) => {
      table.boolean('is_mandatory').notNullable().defaultTo(true);
    });
  }

  // Per-grade price list for a fee (Option 1). Falls back to fee_structures.amount
  // when a grade has no explicit amount.
  const hasAmounts = await knex.schema.hasTable('fee_structure_amounts');
  if (!hasAmounts) {
    await knex.schema.createTable('fee_structure_amounts', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('fee_structure_id').notNullable().references('id').inTable('fee_structures').onDelete('CASCADE');
      table.integer('grade_level').notNullable();
      table.decimal('amount', 12, 2).notNullable().defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['fee_structure_id', 'grade_level']);
      table.index('tenant_id');
      table.index('fee_structure_id');
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('fee_structure_amounts');
  const hasMandatory = await knex.schema.hasColumn('fee_structures', 'is_mandatory');
  if (hasMandatory) {
    await knex.schema.alterTable('fee_structures', (table) => {
      table.dropColumn('is_mandatory');
    });
  }
};
