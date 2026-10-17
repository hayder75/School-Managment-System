// Staff attendance now supports two sessions per day (morning / afternoon).
// Adds a `session` column and widens the uniqueness from one row per staff/day
// to one row per staff/day/session.
exports.up = async function (knex) {
  await knex.schema.alterTable('staff_attendance', (table) => {
    table.string('session', 10).notNullable().defaultTo('am');
  });
  await knex.raw('ALTER TABLE staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_tenant_id_staff_id_date_unique');
  await knex.raw(`
    ALTER TABLE staff_attendance
    ADD CONSTRAINT staff_attendance_tenant_staff_date_session_unique
    UNIQUE (tenant_id, staff_id, date, session)
  `);
  await knex.schema.alterTable('staff_attendance', (table) => {
    table.index('session');
  });
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_tenant_staff_date_session_unique');
  await knex.schema.alterTable('staff_attendance', (table) => {
    table.dropColumn('session');
  });
  await knex.raw(`
    ALTER TABLE staff_attendance
    ADD CONSTRAINT staff_attendance_tenant_id_staff_id_date_unique
    UNIQUE (tenant_id, staff_id, date)
  `);
};