// Employment joining date on staff records (editable by admin/owner/HR).
exports.up = async function up(knex) {
  const has = await knex.schema.hasColumn('users', 'joined_at');
  if (!has) {
    await knex.schema.alterTable('users', (table) => {
      table.date('joined_at');
    });
  }
};

exports.down = async function down(knex) {
  const has = await knex.schema.hasColumn('users', 'joined_at');
  if (has) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('joined_at');
    });
  }
};
