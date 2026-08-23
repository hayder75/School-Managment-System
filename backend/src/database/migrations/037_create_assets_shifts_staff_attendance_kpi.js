exports.up = function (knex) {
  return knex.schema
    .createTable('school_assets', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.string('asset_code', 100);
      table.string('category', 100).notNullable().defaultTo('Other'); // Furniture, Electronics, Books, Lab, Sports, Vehicle, Other
      table.integer('quantity').notNullable().defaultTo(1);
      table.decimal('unit_cost', 12, 2).defaultTo(0);
      table.decimal('total_cost', 12, 2).defaultTo(0);
      table.string('location', 255); // Room 101, Lab A, Main Office
      table.string('status', 50).notNullable().defaultTo('Available'); // Available, In Use, Maintenance, Broken, Disposed
      table.uuid('assigned_to').references('id').inTable('users').onDelete('SET NULL');
      table.date('purchase_date');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('category');
      table.index('status');
    })
    .createTable('teacher_substitutions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('original_teacher_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('substitute_teacher_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.date('date').notNullable();
      table.string('period_name', 100).notNullable(); // Period 1, Morning Shift, Grade 9 Math
      table.string('reason', 255); // Sick Leave, Training, Emergency, Other
      table.string('status', 50).notNullable().defaultTo('scheduled'); // scheduled, completed, cancelled
      table.text('notes');
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('date');
      table.index('original_teacher_id');
      table.index('substitute_teacher_id');
    })
    .createTable('staff_attendance', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('staff_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.date('date').notNullable();
      table.string('status', 50).notNullable().defaultTo('present'); // present, late, absent, half_day, on_leave
      table.string('check_in', 20); // e.g. "08:00"
      table.string('check_out', 20); // e.g. "16:30"
      table.text('notes');
      table.uuid('recorded_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['tenant_id', 'staff_id', 'date']);
      table.index('tenant_id');
      table.index('date');
      table.index('staff_id');
    })
    .createTable('teacher_kpi_metrics', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('teacher_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('period_name', 100).notNullable(); // Q1 2026, August 2026
      table.decimal('attendance_rate', 5, 2).defaultTo(100.0);
      table.decimal('punctuality_rate', 5, 2).defaultTo(100.0);
      table.integer('substitutions_covered').defaultTo(0);
      table.decimal('student_feedback_score', 3, 2).defaultTo(4.50);
      table.decimal('syllabus_completion_rate', 5, 2).defaultTo(90.0);
      table.decimal('overall_rating', 3, 2).defaultTo(4.50);
      table.text('comments');
      table.uuid('evaluated_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('teacher_id');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('teacher_kpi_metrics')
    .dropTableIfExists('staff_attendance')
    .dropTableIfExists('teacher_substitutions')
    .dropTableIfExists('school_assets');
};
