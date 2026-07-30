exports.up = function (knex) {
  return knex.schema
    .createTable('student_promotions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.uuid('from_class_id').references('id').inTable('classes').onDelete('SET NULL');
      table.uuid('to_class_id').references('id').inTable('classes').onDelete('SET NULL');
      table.string('academic_year', 20);
      table.uuid('promoted_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('student_id');
    })
    .createTable('student_graduations', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.string('certificate_number', 50);
      table.string('academic_year', 20);
      table.uuid('graduated_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('student_id');
    })
    .createTable('student_transfers', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.string('transfer_type', 30).notNullable().defaultTo('internal');
      table.uuid('from_class_id').references('id').inTable('classes').onDelete('SET NULL');
      table.uuid('to_class_id').references('id').inTable('classes').onDelete('SET NULL');
      table.text('reason');
      table.uuid('transferred_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('student_id');
    })
    .createTable('student_documents', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.string('type', 50).notNullable();
      table.string('name', 255).notNullable();
      table.text('file_url');
      table.uuid('uploaded_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('student_id');
    })
    .createTable('student_medical', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE').unique();
      table.string('blood_group', 5);
      table.text('allergies');
      table.text('chronic_conditions');
      table.jsonb('emergency_contacts').defaultTo('[]');
      table.jsonb('doctor_info').defaultTo('{}');
      table.jsonb('insurance').defaultTo('{}');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
    })
    .createTable('student_discipline', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.string('incident_type', 50).notNullable();
      table.text('description').notNullable();
      table.string('status', 20).defaultTo('open');
      table.uuid('recorded_by').references('id').inTable('users').onDelete('SET NULL');
      table.uuid('resolved_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('resolved_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('student_id');
    })
    .createTable('student_achievements', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.string('type', 50).notNullable();
      table.string('title', 255).notNullable();
      table.text('description');
      table.date('achieved_date');
      table.uuid('recorded_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('student_id');
    })
    .createTable('student_status_history', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.string('from_status', 20);
      table.string('to_status', 20).notNullable();
      table.text('reason');
      table.uuid('changed_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('student_id');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('student_status_history')
    .dropTableIfExists('student_achievements')
    .dropTableIfExists('student_discipline')
    .dropTableIfExists('student_medical')
    .dropTableIfExists('student_documents')
    .dropTableIfExists('student_transfers')
    .dropTableIfExists('student_graduations')
    .dropTableIfExists('student_promotions');
};
