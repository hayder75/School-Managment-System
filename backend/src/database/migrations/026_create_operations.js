exports.up = function (knex) {
  return knex.schema
    .createTable('books', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('isbn', 20);
      table.string('title', 255).notNullable();
      table.string('author', 255);
      table.string('category', 100);
      table.integer('total_copies').defaultTo(1);
      table.integer('available_copies').defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
    })
    .createTable('book_borrowings', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('book_id').notNullable().references('id').inTable('books').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.date('borrow_date').notNullable().defaultTo(knex.fn.now());
      table.date('due_date').notNullable();
      table.date('return_date');
      table.decimal('fine_amount', 10, 2).defaultTo(0);
      table.string('status', 20).defaultTo('borrowed');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('book_id');
      table.index('student_id');
    })
    .createTable('transport_routes', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('route_name', 255).notNullable();
      table.string('driver_name', 255);
      table.string('driver_phone', 50);
      table.string('vehicle_plate', 50);
      table.integer('capacity').defaultTo(30);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
    })
    .createTable('transport_allocations', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('route_id').notNullable().references('id').inTable('transport_routes').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['route_id', 'student_id']);
      table.index('tenant_id');
    })
    .createTable('hostel_rooms', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('room_number', 50).notNullable();
      table.string('block_name', 100);
      table.integer('capacity').defaultTo(4);
      table.integer('current_occupancy').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
    })
    .createTable('hostel_allocations', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('room_id').notNullable().references('id').inTable('hostel_rooms').onDelete('CASCADE');
      table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
      table.integer('bed_number');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['room_id', 'bed_number']);
      table.unique(['room_id', 'student_id']);
      table.index('tenant_id');
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('hostel_allocations')
    .dropTableIfExists('hostel_rooms')
    .dropTableIfExists('transport_allocations')
    .dropTableIfExists('transport_routes')
    .dropTableIfExists('book_borrowings')
    .dropTableIfExists('books');
};
