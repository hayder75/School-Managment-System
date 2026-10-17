// Per-user data scope by school level (e.g. a KG director sees only
// nursery/kg; a primary director sees only primary).
exports.up = async function up(knex) {
  if (!(await knex.schema.hasColumn('users', 'scope_level_groups'))) {
    await knex.schema.alterTable('users', (table) => {
      table.jsonb('scope_level_groups');
    });
  }
};

exports.down = async function down(knex) {
  if (await knex.schema.hasColumn('users', 'scope_level_groups')) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('scope_level_groups');
    });
  }
};
