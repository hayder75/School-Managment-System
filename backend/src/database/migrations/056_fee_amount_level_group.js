exports.up = async function up(knex) {
  const hasLevel = await knex.schema.hasColumn('fee_structure_amounts', 'level_group');
  if (!hasLevel) {
    await knex.schema.alterTable('fee_structure_amounts', (table) => {
      table.string('level_group', 20).defaultTo('');
    });
  }

  // grade_level alone is ambiguous (Nursery=0, LKG=1, and Primary Grade 1=1),
  // so uniqueness must include the level group.
  await knex.raw('ALTER TABLE fee_structure_amounts DROP CONSTRAINT IF EXISTS fee_structure_amounts_fee_structure_id_grade_level_unique');
  await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS fee_structure_amounts_level_unique ON fee_structure_amounts (fee_structure_id, level_group, grade_level)');
};

exports.down = async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS fee_structure_amounts_level_unique');
  const hasLevel = await knex.schema.hasColumn('fee_structure_amounts', 'level_group');
  if (hasLevel) {
    await knex.schema.alterTable('fee_structure_amounts', (table) => {
      table.dropColumn('level_group');
    });
  }
};
