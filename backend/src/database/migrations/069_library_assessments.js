// Book inventory health: damaged / under-repair / lost counters + an
// assessment log so the librarian can track book condition over time.
exports.up = async function up(knex) {
  const cols = [
    ['damaged_copies', (t) => t.integer('damaged_copies').notNullable().defaultTo(0)],
    ['repair_copies', (t) => t.integer('repair_copies').notNullable().defaultTo(0)],
    ['lost_copies', (t) => t.integer('lost_copies').notNullable().defaultTo(0)],
    ['condition_note', (t) => t.text('condition_note')],
  ];
  for (const [name, def] of cols) {
    if (!(await knex.schema.hasColumn('books', name))) {
      await knex.schema.alterTable('books', (t) => def(t));
    }
  }

  if (!(await knex.schema.hasTable('book_assessments'))) {
    await knex.schema.createTable('book_assessments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('book_id').notNullable().references('id').inTable('books').onDelete('CASCADE');
      table.string('condition', 30).notNullable(); // damaged | under_repair | lost | repaired | found
      table.integer('copies').notNullable().defaultTo(1);
      table.text('note');
      table.uuid('assessed_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('tenant_id');
      table.index('book_id');
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('book_assessments');
  for (const name of ['damaged_copies', 'repair_copies', 'lost_copies', 'condition_note']) {
    if (await knex.schema.hasColumn('books', name)) {
      await knex.schema.alterTable('books', (t) => t.dropColumn(name));
    }
  }
};
