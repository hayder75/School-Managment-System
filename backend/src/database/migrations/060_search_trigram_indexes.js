// Trigram GIN indexes to speed up ILIKE '%term%' name/phone searches.
// Safe to re-run: each index is created with IF NOT EXISTS.
exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

  const indexes = [
    ['users', 'users_first_name_trgm', 'first_name gin_trgm_ops'],
    ['users', 'users_last_name_trgm', 'last_name gin_trgm_ops'],
    ['users', 'users_email_trgm', 'email gin_trgm_ops'],
    ['users', 'users_phone_trgm', 'phone gin_trgm_ops'],
    ['students', 'students_student_number_trgm', 'student_number gin_trgm_ops'],
    ['students', 'students_father_name_trgm', 'father_name gin_trgm_ops'],
    ['students', 'students_mother_name_trgm', 'mother_name gin_trgm_ops'],
  ];

  for (const [table, name, column] of indexes) {
    const exists = await knex.schema.hasTable(table);
    if (!exists) continue;
    await knex.raw(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} USING gin (${column})`);
  }
};

exports.down = async function down(knex) {
  const names = [
    'users_first_name_trgm',
    'users_last_name_trgm',
    'users_email_trgm',
    'users_phone_trgm',
    'students_student_number_trgm',
    'students_father_name_trgm',
    'students_mother_name_trgm',
  ];
  for (const name of names) {
    await knex.raw(`DROP INDEX IF EXISTS ${name}`);
  }
};
