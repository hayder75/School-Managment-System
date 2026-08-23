exports.up = async function up(knex) {
  await knex.schema
    .createTable('visitor_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('visitor_name', 255).notNullable();
      table.string('phone', 50);
      table.string('national_id', 100);
      table.string('person_visited', 255).notNullable();
      table.text('purpose').notNullable();
      table.string('badge_number', 50);
      table.timestamp('time_in').defaultTo(knex.fn.now());
      table.timestamp('time_out');
      table.uuid('recorded_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('tenant_id');
      table.index('time_in');
    })
    .createTable('student_gate_passes', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.uuid('issued_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.date('departure_date').notNullable();
      table.time('departure_time').notNullable();
      table.text('reason').notNullable();
      table.string('authorized_pickup_person', 255);
      table.string('pass_code', 50).notNullable();
      table.string('status', 50).notNullable().defaultTo('issued'); // issued, verified_departed, cancelled
      table.uuid('verified_by_security').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('verified_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index('tenant_id');
      table.index('student_id');
      table.index('pass_code');
      table.index('status');
    })
    .createTable('campus_incidents', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('title', 255).notNullable();
      table.string('location', 255).notNullable();
      table.date('incident_date').notNullable();
      table.time('incident_time');
      table.string('category', 100).notNullable(); // trespassing, property_damage, physical_altercation, theft, other
      table.string('severity', 50).notNullable().defaultTo('medium'); // low, medium, high, critical
      table.text('description').notNullable();
      table.uuid('reported_by').references('id').inTable('users').onDelete('SET NULL');
      table.text('action_taken');
      table.string('status', 50).notNullable().defaultTo('investigating'); // investigating, resolved, escalated
      table.boolean('escalated_to_gm').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.index('tenant_id');
      table.index('incident_date');
      table.index('severity');
    })
    .createTable('maintenance_requests', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('title', 255).notNullable();
      table.string('location', 255).notNullable();
      table.string('category', 100).notNullable(); // electrical, plumbing, furniture, structural, other
      table.text('description').notNullable();
      table.uuid('reported_by').references('id').inTable('users').onDelete('SET NULL');
      table.string('assigned_to', 255);
      table.decimal('estimated_cost', 12, 2).defaultTo(0);
      table.decimal('actual_cost', 12, 2).defaultTo(0);
      table.string('priority', 50).notNullable().defaultTo('normal'); // low, normal, urgent, emergency
      table.string('status', 50).notNullable().defaultTo('open'); // open, in_progress, completed, cancelled
      table.timestamp('completed_at');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.index('tenant_id');
      table.index('status');
      table.index('category');
    })
    .createTable('consumable_requests', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('item_name', 255).notNullable();
      table.string('category', 100).notNullable(); // office_supplies, cleaning, lab_supplies, teaching_aids, other
      table.integer('quantity').notNullable().defaultTo(1);
      table.decimal('estimated_cost', 12, 2).defaultTo(0);
      table.text('justification');
      table.uuid('requested_by').references('id').inTable('users').onDelete('SET NULL');
      table.string('status', 50).notNullable().defaultTo('pending_approval'); // pending_approval, approved, rejected, purchased
      table.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('approved_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.index('tenant_id');
      table.index('status');
    });
};

exports.down = async function down(knex) {
  await knex.schema
    .dropTableIfExists('consumable_requests')
    .dropTableIfExists('maintenance_requests')
    .dropTableIfExists('campus_incidents')
    .dropTableIfExists('student_gate_passes')
    .dropTableIfExists('visitor_logs');
};
