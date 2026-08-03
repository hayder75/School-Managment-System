exports.up = function (knex) {
  return knex.schema.table('payments', (table) => {
    table.uuid('collected_by').references('id').inTable('users').onDelete('SET NULL');
    table.index('collected_by');
  });
};

exports.down = function (knex) {
  return knex.schema.table('payments', (table) => {
    table.dropIndex('collected_by');
    table.dropColumn('collected_by');
  });
};
