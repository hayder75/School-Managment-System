/**
 * Student attendance is taken twice a day (morning and afternoon).
 * Existing rows become the morning session.
 */
exports.up = async function up(knex) {
  if (!(await knex.schema.hasColumn('attendance', 'session'))) {
    await knex.schema.table('attendance', (table) => {
      table.string('session', 10).notNullable().defaultTo('am');
    });
  }

  // The old uniqueness blocked a second row for the same day.
  await knex.raw('ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_class_id_date_unique');

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_class_date_session_unique
    ON attendance (student_id, class_id, date, session)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS attendance_tenant_class_date_session_idx
    ON attendance (tenant_id, class_id, date, session)
  `);
};

exports.down = async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS attendance_tenant_class_date_session_idx');
  await knex.raw('DROP INDEX IF EXISTS attendance_student_class_date_session_unique');

  // Keep one row per student/day so the old constraint can be restored.
  await knex.raw(`
    DELETE FROM attendance a
    USING attendance b
    WHERE a.id <> b.id
      AND a.student_id = b.student_id
      AND a.class_id = b.class_id
      AND a.date = b.date
      AND a.session = 'pm'
      AND b.session = 'am'
  `);

  await knex.raw(`
    ALTER TABLE attendance
    ADD CONSTRAINT attendance_student_id_class_id_date_unique
    UNIQUE (student_id, class_id, date)
  `);

  if (await knex.schema.hasColumn('attendance', 'session')) {
    await knex.schema.table('attendance', (table) => table.dropColumn('session'));
  }
};
