exports.up = function (knex) {
  return knex.schema.createTable('branches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('address');
    table.string('phone', 50);
    table.boolean('is_head_office').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('tenant_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('branches');
};
