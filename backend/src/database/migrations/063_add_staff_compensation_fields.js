// Per-staff employment/compensation terms (from the staff roster), editable by
// admin/owner/HR and shown on the staff/teacher pages.
exports.up = async function up(knex) {
  const cols = [
    ['basic_salary', 'decimal(12,2)'],
    ['allowance', 'decimal(12,2)'],
    ['housing_allowance', 'decimal(12,2)'],
    ['account_allowance', 'decimal(12,2)'],
    ['phone_allowance', 'decimal(12,2)'],
  ];
  for (const [name, type] of cols) {
    if (!(await knex.schema.hasColumn('users', name))) {
      await knex.schema.alterTable('users', (table) => {
        table.specificType(name, type);
      });
    }
  }
};

exports.down = async function down(knex) {
  const cols = ['basic_salary', 'allowance', 'housing_allowance', 'account_allowance', 'phone_allowance'];
  for (const name of cols) {
    if (await knex.schema.hasColumn('users', name)) {
      await knex.schema.alterTable('users', (table) => {
        table.dropColumn(name);
      });
    }
  }
};
