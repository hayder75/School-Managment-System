// Store kindergarten students' mother's and father's phone numbers so both can
// be called in an emergency.
exports.up = async function up(knex) {
  for (const col of ['mother_phone', 'father_phone']) {
    if (!(await knex.schema.hasColumn('students', col))) {
      await knex.schema.alterTable('students', (table) => {
        table.string(col, 50);
      });
    }
  }
};

exports.down = async function down(knex) {
  for (const col of ['mother_phone', 'father_phone']) {
    if (await knex.schema.hasColumn('students', col)) {
      await knex.schema.alterTable('students', (table) => {
        table.dropColumn(col);
      });
    }
  }
};
