exports.up = async function up(knex) {
  const has = await knex.schema.hasTable('student_fee_subscriptions');
  if (has) return;

  await knex.schema.createTable('student_fee_subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    table.uuid('fee_structure_id').notNullable().references('id').inTable('fee_structures').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['student_id', 'fee_structure_id']);
    table.index('tenant_id');
    table.index('student_id');
    table.index('fee_structure_id');
  });
};

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('student_fee_subscriptions');
};
