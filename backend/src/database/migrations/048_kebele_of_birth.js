exports.up = async function up(knex) {
  const has = await knex.schema.hasColumn('students', 'kebele_of_birth');
  if (!has) {
    await knex.schema.table('students', (table) => {
      table.string('kebele_of_birth', 150);
    });
  }
};

exports.down = async function down(knex) {
  if (await knex.schema.hasColumn('students', 'kebele_of_birth')) {
    await knex.schema.table('students', (table) => table.dropColumn('kebele_of_birth'));
  }
};