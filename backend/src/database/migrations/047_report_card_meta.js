exports.up = async function up(knex) {
  await knex.schema.createTable('report_card_meta', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    table.uuid('term_id').notNullable().references('id').inTable('terms').onDelete('CASCADE');
    table.text('remarks');
    table.boolean('published').defaultTo(false);
    table.timestamp('published_at');
    table.uuid('published_by').references('id').inTable('users').onDelete('SET NULL');
    table.unique(['student_id', 'term_id']);
    table.index('tenant_id');
  });
};

exports.down = async function down(knex) {
  return knex.schema.dropTableIfExists('report_card_meta');
};
