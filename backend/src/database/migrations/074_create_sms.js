exports.up = function (knex) {
  return knex.schema
    .createTable('sms_campaigns', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.string('title', 255).notNullable();
      table.text('message').notNullable();
      table.uuid('class_id').references('id').inTable('classes').onDelete('SET NULL');
      table.string('class_name', 150);
      table.string('audience', 20).notNullable().defaultTo('parents');
      table.integer('total_recipients').notNullable().defaultTo(0);
      table.integer('sent_count').notNullable().defaultTo(0);
      table.integer('failed_count').notNullable().defaultTo(0);
      table.string('status', 20).notNullable().defaultTo('queued'); // queued | processing | completed | cancelled
      table.boolean('test_mode').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('status');
    })
    .createTable('sms_messages', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('campaign_id').notNullable().references('id').inTable('sms_campaigns').onDelete('CASCADE');
      table.uuid('recipient_user_id').references('id').inTable('users').onDelete('SET NULL');
      table.uuid('student_id').references('id').inTable('students').onDelete('SET NULL');
      table.string('phone', 30).notNullable();
      table.text('message').notNullable();
      table.string('status', 20).notNullable().defaultTo('queued'); // queued | sent | failed
      table.integer('attempts').notNullable().defaultTo(0);
      table.text('error');
      table.timestamp('sent_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('campaign_id');
      table.index('status');
      table.index('sent_at');
    });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('sms_messages').dropTableIfExists('sms_campaigns');
};