exports.up = async function up(knex) {
  // Allow an exam to span multiple classes (e.g. 5A + 6B)
  const hasClassIds = await knex.schema.hasColumn('exams', 'class_ids');
  if (!hasClassIds) {
    await knex.schema.table('exams', (table) => {
      table.jsonb('class_ids'); // array of class uuids; null for single-class legacy
    });
  }

  // Mark a timetable slot as a test day
  const hasIsTest = await knex.schema.hasColumn('timetable_entries', 'is_test');
  if (!hasIsTest) {
    await knex.schema.table('timetable_entries', (table) => {
      table.boolean('is_test').defaultTo(false);
    });
  }
};

exports.down = async function down(knex) {
  if (await knex.schema.hasColumn('exams', 'class_ids')) {
    await knex.schema.table('exams', (table) => table.dropColumn('class_ids'));
  }
  if (await knex.schema.hasColumn('timetable_entries', 'is_test')) {
    await knex.schema.table('timetable_entries', (table) => table.dropColumn('is_test'));
  }
};
