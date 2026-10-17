// Snapshot-based report sharing. A share stores an immutable, sanitized copy of
// a report so the public page never touches live data or internal APIs.
exports.up = async function up(knex) {
  if (!(await knex.schema.hasTable('report_shares'))) {
    await knex.schema.createTable('report_shares', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('token', 64).notNullable().unique();
      table.string('report_id', 100).notNullable();
      table.string('title', 255);
      table.jsonb('filters').defaultTo('{}');
      table.jsonb('payload').notNullable();
      table.boolean('include_names').notNullable().defaultTo(false);
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('expires_at');
      table.boolean('revoked').notNullable().defaultTo(false);
      table.integer('views').notNullable().defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['tenant_id']);
      table.index(['token']);
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('report_shares');
};
