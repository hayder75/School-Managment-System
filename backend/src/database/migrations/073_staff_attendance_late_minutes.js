// Records how late a staff member was for a session (in minutes).
exports.up = function (knex) {
  return knex.schema.alterTable('staff_attendance', (table) => {
    table.integer('late_minutes').notNullable().defaultTo(0);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('staff_attendance', (table) => {
    table.dropColumn('late_minutes');
  });
};