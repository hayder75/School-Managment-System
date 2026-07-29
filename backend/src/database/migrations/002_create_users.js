exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
    table.string('email', 255).notNullable();
    table.string('password_hash', 255);
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('phone', 50);
    table.text('avatar');
    table.string('role', 50).notNullable().defaultTo('student');
    table.string('status', 20).defaultTo('invited');
    table.timestamp('last_login');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'email']);
    table.index('tenant_id');
    table.index('role');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
