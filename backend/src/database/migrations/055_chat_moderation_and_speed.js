exports.up = async function up(knex) {
  // Denormalized last-message info for fast conversation lists.
  const hasLast = await knex.schema.hasColumn('chat_conversations', 'last_message_at');
  if (!hasLast) {
    await knex.schema.alterTable('chat_conversations', (table) => {
      table.timestamp('last_message_at');
      table.string('last_message_preview', 300);
      table.index(['tenant_id', 'last_message_at']);
    });
  }

  const hasReports = await knex.schema.hasTable('chat_reports');
  if (!hasReports) {
    await knex.schema.createTable('chat_reports', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('conversation_id').notNullable().references('id').inTable('chat_conversations').onDelete('CASCADE');
      table.uuid('message_id').references('id').inTable('chat_messages').onDelete('SET NULL');
      table.uuid('reported_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.text('reason');
      table.string('status', 20).notNullable().defaultTo('open'); // open | resolved
      table.uuid('resolved_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('resolved_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index(['tenant_id', 'status']);
      table.index('conversation_id');
    });
  }

  const hasRestrictions = await knex.schema.hasTable('chat_restrictions');
  if (!hasRestrictions) {
    await knex.schema.createTable('chat_restrictions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('restricted_by').references('id').inTable('users').onDelete('SET NULL');
      table.text('reason');
      table.boolean('active').notNullable().defaultTo(true);
      table.timestamp('lifted_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'user_id']);
      table.index('tenant_id');
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('chat_restrictions');
  await knex.schema.dropTableIfExists('chat_reports');
  const hasLast = await knex.schema.hasColumn('chat_conversations', 'last_message_at');
  if (hasLast) {
    await knex.schema.alterTable('chat_conversations', (table) => {
      table.dropColumn('last_message_preview');
      table.dropColumn('last_message_at');
    });
  }
};
