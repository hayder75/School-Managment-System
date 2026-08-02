exports.up = function (knex) {
  return knex.schema
    .alterTable('enrollments', (table) => {
      table.string('grade_level', 20).alter();
    })
    .table('users', (table) => {
      table.string('gender', 20);
    });
};

exports.down = function (knex) {
  return knex.schema
    .table('users', (table) => {
      table.dropColumn('gender');
    })
    .alterTable('enrollments', (table) => {
      table.integer('grade_level').alter();
    });
};
