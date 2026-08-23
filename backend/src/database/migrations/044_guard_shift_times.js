exports.up = async function up(knex) {
  const hasStart = await knex.schema.hasColumn('guard_shifts', 'start_time');
  if (!hasStart) {
    await knex.schema.table('guard_shifts', (table) => {
      table.string('start_time', 10).defaultTo('06:00');
      table.string('end_time', 10).defaultTo('18:00');
    });
  }
};

exports.down = async function down(knex) {
  const hasStart = await knex.schema.hasColumn('guard_shifts', 'start_time');
  if (hasStart) {
    await knex.schema.table('guard_shifts', (table) => {
      table.dropColumn('start_time');
      table.dropColumn('end_time');
    });
  }
};
