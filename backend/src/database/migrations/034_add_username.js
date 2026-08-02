exports.up = function (knex) {
  return knex.schema.table('users', (table) => {
    table.string('username', 50);
    table.index('username');
    table.unique(['tenant_id', 'username']);
  });
};

exports.down = function (knex) {
  return knex.schema.table('users', (table) => {
    table.dropUnique(['tenant_id', 'username']);
    table.dropIndex('username');
    table.dropColumn('username');
  });
};
