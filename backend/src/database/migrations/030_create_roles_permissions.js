const { seedTenant } = require('../../modules/roles/roles.seed');

exports.up = async function (knex) {
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description');
    table.boolean('is_system').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'name']);
    table.index('tenant_id');
  });

  await knex.schema.createTable('permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
    table.string('key', 100).notNullable();
    table.string('label', 150).notNullable();
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'key']);
    table.index('tenant_id');
  });

  await knex.schema.createTable('role_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    table.unique(['role_id', 'permission_id']);
    table.index('tenant_id');
  });

  await knex.schema.createTable('user_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.unique(['user_id', 'role_id']);
    table.index('tenant_id');
  });

  await knex.schema.createTable('user_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    table.unique(['user_id', 'permission_id']);
    table.index('tenant_id');
  });

  const tenants = await knex('tenants').select('id');
  for (const t of tenants) {
    await seedTenant(knex, t.id);
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('user_permissions');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('roles');
};
