// Store students' middle names separately so first/middle/last are correct.
exports.up = async function up(knex) {
  if (!(await knex.schema.hasColumn('users', 'middle_name'))) {
    await knex.schema.alterTable('users', (table) => {
      table.string('middle_name', 100);
    });
  }
};

exports.down = async function down(knex) {
  if (await knex.schema.hasColumn('users', 'middle_name')) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('middle_name');
    });
  }
};
