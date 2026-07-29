exports.up = function (knex) {
  return knex.schema.createTable('announcements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table.string('audience', 50).defaultTo('all');
    table.uuid('class_id').references('id').inTable('classes').onDelete('CASCADE');
    table.boolean('is_published').defaultTo(true);
    table.timestamp('published_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('tenant_id');
    table.index('class_id');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('announcements');
};
