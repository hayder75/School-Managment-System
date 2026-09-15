exports.up = async function (knex) {
  await knex.schema.alterTable('payroll', (table) => {
    table.decimal('unpaid_days', 6, 1).defaultTo(0);
    table.decimal('attendance_deduction', 12, 2).defaultTo(0);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('payroll', (table) => {
    table.dropColumn('unpaid_days');
    table.dropColumn('attendance_deduction');
  });
};
