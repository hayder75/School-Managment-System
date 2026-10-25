exports.up = async function (knex) {
  await knex.schema.createTable('kg_schedule_slots', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('level', 10).notNullable(); // nursery | lkg | ukg
    table.integer('sort_order').notNullable().defaultTo(0);
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.boolean('full_week').notNullable().defaultTo(false);
    table.text('activity');
    table.text('monday');
    table.text('tuesday');
    table.text('wednesday');
    table.text('thursday');
    table.text('friday');
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'level', 'sort_order']);
    table.index(['tenant_id', 'level']);
  });

  // Nursery / LKG / UKG use the new Early Years schedule, so remove any
  // auto-generated normal timetable entries for those classes.
  await knex.raw(`
    DELETE FROM timetable_entries
    WHERE class_id IN (SELECT id FROM classes WHERE level_group IN ('nursery', 'kg'))
  `);
};

exports.down = async function (knex) {
  return knex.schema.dropTableIfExists('kg_schedule_slots');
};