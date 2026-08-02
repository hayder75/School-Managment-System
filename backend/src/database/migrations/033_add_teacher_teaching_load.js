exports.up = function (knex) {
  return knex.schema.table('users', (table) => {
    table.integer('section_count');
    table.integer('periods_per_week');
    table.integer('overtime_periods');
    table.integer('total_periods');
  });
};

exports.down = function (knex) {
  return knex.schema.table('users', (table) => {
    table.dropColumn('section_count');
    table.dropColumn('periods_per_week');
    table.dropColumn('overtime_periods');
    table.dropColumn('total_periods');
  });
};
