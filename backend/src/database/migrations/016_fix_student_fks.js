exports.up = async function (knex) {
  await knex.schema.alterTable('grades', (table) => {
    table.dropForeign('student_id');
    table.foreign('student_id').references('id').inTable('users').onDelete('CASCADE');
  });

  await knex.schema.alterTable('attendance', (table) => {
    table.dropForeign('student_id');
    table.foreign('student_id').references('id').inTable('users').onDelete('CASCADE');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('grades', (table) => {
    table.dropForeign('student_id');
    table.foreign('student_id').references('id').inTable('students').onDelete('CASCADE');
  });

  await knex.schema.alterTable('attendance', (table) => {
    table.dropForeign('student_id');
    table.foreign('student_id').references('id').inTable('students').onDelete('CASCADE');
  });
};
