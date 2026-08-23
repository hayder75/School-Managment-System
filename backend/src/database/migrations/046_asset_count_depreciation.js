exports.up = async function up(knex) {
  const has = await knex.schema.hasColumn('school_assets', 'counted_quantity');
  if (!has) {
    await knex.schema.table('school_assets', (table) => {
      table.integer('counted_quantity');
      table.date('counted_date');
      table.string('counted_by', 150);
      table.text('count_notes');
      table.integer('useful_life_years');
    });
  }
};

exports.down = async function down(knex) {
  const has = await knex.schema.hasColumn('school_assets', 'counted_quantity');
  if (has) {
    await knex.schema.table('school_assets', (table) => {
      table.dropColumn('counted_quantity');
      table.dropColumn('counted_date');
      table.dropColumn('counted_by');
      table.dropColumn('count_notes');
      table.dropColumn('useful_life_years');
    });
  }
};
