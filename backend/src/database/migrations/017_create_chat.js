exports.up = function (knex) {
  return knex.schema
    .createTable('chat_conversations', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('subject', 255);
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
    })
    .createTable('chat_participants', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('conversation_id').notNullable().references('id').inTable('chat_conversations').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('last_read_at');
      table.timestamp('joined_at').defaultTo(knex.fn.now());
      table.unique(['conversation_id', 'user_id']);
      table.index('user_id');
    })
    .createTable('chat_messages', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('conversation_id').notNullable().references('id').inTable('chat_conversations').onDelete('CASCADE');
      table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.text('content').notNullable();
      table.text('attachment_url');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('edited_at');
      table.index(['conversation_id', 'created_at']);
      table.index('tenant_id');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('chat_messages')
    .dropTableIfExists('chat_participants')
    .dropTableIfExists('chat_conversations');
};
