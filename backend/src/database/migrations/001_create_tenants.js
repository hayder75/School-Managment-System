exports.up = function (knex) {
  return knex.schema.createTable('tenants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.string('domain', 255);
    table.text('logo');
    table.text('address');
    table.string('phone', 50);
    table.string('email', 255);
    table.string('subscription_plan', 50).defaultTo('free');
    table.string('status', 20).defaultTo('active');
    table.jsonb('settings').defaultTo('{}');
    table.uuid('created_by');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('tenants');
};
