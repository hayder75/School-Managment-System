exports.up = async function up(knex) {
  const hasReceipt = await knex.schema.hasColumn('payments', 'receipt_no');
  if (!hasReceipt) {
    await knex.schema.alterTable('payments', (table) => {
      table.string('receipt_no', 50);
    });
  }

  // Backfill existing payments with a per-tenant sequential receipt number.
  await knex.raw(`
    WITH numbered AS (
      SELECT id, tenant_id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) AS rn
      FROM payments
    )
    UPDATE payments p
    SET receipt_no = 'RCT-' || LPAD(n.rn::text, 6, '0')
    FROM numbered n
    WHERE p.id = n.id AND p.receipt_no IS NULL
  `);

  // Enforce uniqueness per tenant (allows NULLs for legacy rows, if any).
  await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS payments_tenant_receipt_no_unique ON payments (tenant_id, receipt_no)');
};

exports.down = async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS payments_tenant_receipt_no_unique');
  const hasReceipt = await knex.schema.hasColumn('payments', 'receipt_no');
  if (hasReceipt) {
    await knex.schema.alterTable('payments', (table) => {
      table.dropColumn('receipt_no');
    });
  }
};
