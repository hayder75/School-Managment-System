// Library module: richer book records, borrowing details, and a per-tenant
// fine/loan settings row controlled by the librarian.
exports.up = async function up(knex) {
  // books: extra catalog fields
  const bookCols = [
    ['publisher', (t) => t.string('publisher', 150)],
    ['published_year', (t) => t.integer('published_year')],
    ['shelf', (t) => t.string('shelf', 100)],
    ['description', (t) => t.text('description')],
    ['replacement_cost', (t) => t.decimal('replacement_cost', 10, 2).defaultTo(0)],
  ];
  for (const [name, def] of bookCols) {
    if (!(await knex.schema.hasColumn('books', name))) {
      await knex.schema.alterTable('books', (t) => def(t));
    }
  }

  // book_borrowings: issue/return details
  const borrowCols = [
    ['issued_by', (t) => t.uuid('issued_by').references('id').inTable('users').onDelete('SET NULL')],
    ['remarks', (t) => t.text('remarks')],
    ['returned_condition', (t) => t.string('returned_condition', 50)],
    ['renew_count', (t) => t.integer('renew_count').notNullable().defaultTo(0)],
  ];
  for (const [name, def] of borrowCols) {
    if (!(await knex.schema.hasColumn('book_borrowings', name))) {
      await knex.schema.alterTable('book_borrowings', (t) => def(t));
    }
  }

  if (!(await knex.schema.hasTable('library_settings'))) {
    await knex.schema.createTable('library_settings', (table) => {
      table.uuid('tenant_id').primary().references('id').inTable('tenants').onDelete('CASCADE');
      table.integer('loan_days').notNullable().defaultTo(14);
      table.boolean('fine_enabled').notNullable().defaultTo(false);
      table.decimal('fine_per_day', 10, 2).notNullable().defaultTo(0);
      table.integer('grace_days').notNullable().defaultTo(0);
      table.integer('default_max_books').notNullable().defaultTo(2);
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('library_settings');
  for (const name of ['issued_by', 'remarks', 'returned_condition', 'renew_count']) {
    if (await knex.schema.hasColumn('book_borrowings', name)) {
      await knex.schema.alterTable('book_borrowings', (t) => t.dropColumn(name));
    }
  }
  for (const name of ['publisher', 'published_year', 'shelf', 'description', 'replacement_cost']) {
    if (await knex.schema.hasColumn('books', name)) {
      await knex.schema.alterTable('books', (t) => t.dropColumn(name));
    }
  }
};
