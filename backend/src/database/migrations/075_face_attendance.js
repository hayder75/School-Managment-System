exports.up = async function (knex) {
  await knex.schema.createTable('staff_face_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('descriptor_cipher').notNullable();
    table.float('quality').notNullable().defaultTo(0);
    table.string('source', 20).notNullable().defaultTo('MANUAL');
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('tenant_id');
    table.index('user_id');
  });

  await knex.schema.createTable('face_attendance_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('session', 10);
    table.string('action', 30).notNullable().defaultTo('SCAN');
    table.boolean('matched').notNullable().defaultTo(false);
    table.float('match_distance');
    table.boolean('liveness_passed').notNullable().defaultTo(false);
    table.string('source', 20).notNullable().defaultTo('FACE');
    table.string('ip', 64);
    table.string('device_info', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('tenant_id');
    table.index('user_id');
    table.index('created_at');
  });

  await knex.schema.alterTable('staff_attendance', (table) => {
    table.string('source', 20).notNullable().defaultTo('manual');
    table.index('source');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('staff_attendance', (table) => {
    table.dropIndex('source');
    table.dropColumn('source');
  });
  await knex.schema.dropTableIfExists('face_attendance_logs');
  await knex.schema.dropTableIfExists('staff_face_templates');
};