const { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } = require('../../shared/permissionCatalog');

async function seedTenant(knex, tenantId) {
  if (!tenantId) return;

  await knex('permissions')
    .insert(PERMISSIONS.map((p) => ({
      tenant_id: tenantId,
      key: p.key,
      label: p.label,
      description: p.description,
    })))
    .onConflict(['tenant_id', 'key'])
    .ignore();

  for (const [roleName, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const [role] = await knex('roles')
      .insert({
        tenant_id: tenantId,
        name: roleName,
        description: `Built-in ${roleName} role`,
        is_system: true,
      })
      .onConflict(['tenant_id', 'name'])
      .merge()
      .returning('*');

    if (!role) continue;

    const permRows = await knex('permissions')
      .where({ tenant_id: tenantId })
      .whereIn('key', keys)
      .select('id');

    const existing = await knex('role_permissions')
      .where({ role_id: role.id })
      .select('permission_id');
    const have = new Set(existing.map((r) => r.permission_id));

    const toInsert = permRows
      .filter((p) => !have.has(p.id))
      .map((p) => ({ tenant_id: tenantId, role_id: role.id, permission_id: p.id }));

    if (toInsert.length) {
      await knex('role_permissions').insert(toInsert).onConflict(['role_id', 'permission_id']).ignore();
    }
  }
}

module.exports = { seedTenant };
