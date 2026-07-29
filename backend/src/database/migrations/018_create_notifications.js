exports.up = function (knex) {
  return knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('message');
    table.string('type', 50).defaultTo('info');
    table.string('reference_type', 50);
    table.uuid('reference_id');
    table.boolean('is_read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['tenant_id', 'user_id', 'is_read']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('notifications');
};
