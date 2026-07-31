exports.up = function (knex) {
  return knex.schema
    .table('exams', (table) => {
      table.uuid('locked_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('locked_at');
    })
    .table('students', (table) => {
      table.string('previous_school', 255);
      table.string('admission_type', 30).defaultTo('new');
      table.date('date_of_birth');
      table.string('gender', 10);
      table.text('home_address');
      table.date('transfer_date');
    })
    .table('student_transfers', (table) => {
      table.string('previous_school', 255);
      table.date('transfer_date');
    })
    .then(() =>
      knex.raw('ALTER TABLE grades ADD CONSTRAINT grades_marks_non_negative CHECK (marks_obtained >= 0)')
    );
};

exports.down = function (knex) {
  return knex.schema
    .table('exams', (table) => {
      table.dropColumn('locked_by');
      table.dropColumn('locked_at');
    })
    .table('students', (table) => {
      table.dropColumn('previous_school');
      table.dropColumn('admission_type');
      table.dropColumn('date_of_birth');
      table.dropColumn('gender');
      table.dropColumn('home_address');
      table.dropColumn('transfer_date');
    })
    .table('student_transfers', (table) => {
      table.dropColumn('previous_school');
      table.dropColumn('transfer_date');
    })
    .then(() =>
      knex.raw('ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_marks_non_negative')
    );
};
