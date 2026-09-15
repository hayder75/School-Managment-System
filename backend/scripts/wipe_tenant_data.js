#!/usr/bin/env node
/**
 * Wipe demo data for the tenant before reseeding the real data.
 * Dry-run by default; pass --apply to delete. Keeps owner/super_admin accounts.
 * Uses session_replication_role=replica to avoid FK ordering issues (sms_user is superuser).
 * Usage: node scripts/wipe_tenant_data.js [--apply]
 */
const db = require('../src/config/database');
const APPLY = process.argv.includes('--apply');

async function tenantTables(trx) {
  const { rows } = await trx.raw(
    `select table_name from information_schema.columns
     where table_schema = current_schema() and column_name = 'tenant_id' and table_name <> 'tenants'`
  );
  return rows.map((r) => r.table_name);
}

(async () => {
  const tenant = await db('tenants').select('id').first();
  const tenantId = tenant.id;

  const tables = await tenantTables(db);

  if (!APPLY) {
    const counts = {};
    for (const t of tables) {
      try { const [{ c }] = await db(t).where({ tenant_id: tenantId }).count('* as c'); if (Number(c) > 0) counts[t] = Number(c); } catch { /* ignore */ }
    }
    const [{ c: users }] = await db('users').where({ tenant_id: tenantId }).whereNotIn('role', ['owner', 'super_admin']).count('* as c');
    counts['users (non-owner)'] = Number(users);
    console.log(JSON.stringify({ mode: 'DRY-RUN', tables: tables.length, counts }, null, 2));
    console.log('dry-run only (pass --apply to delete)');
    await db.destroy();
    return;
  }

  await db.transaction(async (trx) => {
    await trx.raw('SET LOCAL session_replication_role = replica');

    // Delete every tenant-scoped table.
    for (const t of tables) {
      try { await trx(t).where({ tenant_id: tenantId }).del(); } catch { /* table without rows/constraint */ }
    }
    // Non-tenant tables that reference tenant data.
    await trx.raw('DELETE FROM chat_participants WHERE conversation_id IN (SELECT id FROM chat_conversations WHERE tenant_id = ?)', [tenantId]);
    await trx.raw('DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE tenant_id = ?)', [tenantId]);
    // Users except owners/super admins.
    await trx('users').where({ tenant_id: tenantId }).whereNotIn('role', ['owner', 'super_admin']).del();
  });

  console.log('wipe complete');
  await db.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
