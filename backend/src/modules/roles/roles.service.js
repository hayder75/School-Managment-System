const db = require('../../config/database');
const { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS } = require('../../shared/permissionCatalog');

const SYSTEM_ROLE_NAMES = Object.keys(DEFAULT_ROLE_PERMISSIONS);

async function listRoles(tenantId) {
  const roles = await db('roles')
    .where({ tenant_id: tenantId })
    .orderBy([{ column: 'is_system', order: 'desc' }, { column: 'name', order: 'asc' }]);

  const rolePerms = await db('role_permissions')
    .where({ 'role_permissions.tenant_id': tenantId })
    .join('permissions', 'role_permissions.permission_id', 'permissions.id')
    .select('role_permissions.role_id', 'permissions.key', 'permissions.label');

  const byRole = {};
  for (const rp of rolePerms) {
    if (!byRole[rp.role_id]) byRole[rp.role_id] = [];
    byRole[rp.role_id].push({ key: rp.key, label: rp.label });
  }

  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    is_system: !!r.is_system,
    permissions: byRole[r.id] || [],
    permission_keys: (byRole[r.id] || []).map((p) => p.key),
  }));
}

async function listPermissions(tenantId) {
  return db('permissions')
    .where({ tenant_id: tenantId })
    .select('id', 'key', 'label', 'description')
    .orderBy('label');
}

async function resolvePermissionIds(tenantId, keys) {
  if (!keys || !keys.length) {
    return { ids: [], found: new Set() };
  }
  const rows = await db('permissions').where({ tenant_id: tenantId }).whereIn('key', keys).select('id', 'key');
  return { ids: rows.map((r) => r.id), found: new Set(rows.map((r) => r.key)) };
}

function notFound() {
  const err = new Error('ROLE_NOT_FOUND');
  err.code = 'ROLE_NOT_FOUND';
  return err;
}

function systemRole() {
  const err = new Error('Cannot delete a system role');
  err.code = 'ROLE_IS_SYSTEM';
  return err;
}

async function createRole(tenantId, { name, description, permission_keys }) {
  const keys = permission_keys || [];
  const { ids, found } = await resolvePermissionIds(tenantId, keys);
  const invalid = keys.filter((k) => !found.has(k));
  if (invalid.length) {
    const err = new Error(`Unknown permission key(s): ${invalid.join(', ')}`);
    err.code = 'INVALID_PERMISSIONS';
    throw err;
  }

  const [role] = await db('roles')
    .insert({ tenant_id: tenantId, name, description: description || null })
    .returning('*');

  if (ids.length) {
    await db('role_permissions')
      .insert(ids.map((permission_id) => ({ tenant_id: tenantId, role_id: role.id, permission_id })));
  }
  return role;
}

async function updateRole(tenantId, id, { name, description, permission_keys }) {
  const role = await db('roles').where({ tenant_id: tenantId, id }).first();
  if (!role) throw notFound();

  await db('roles').where({ id }).update({ name, description: description || null });

  let keys = permission_keys || [];
  if (role.name === 'owner') {
    if (!keys.includes('roles.manage')) keys = [...keys, 'roles.manage'];
  }

  const { ids, found } = await resolvePermissionIds(tenantId, keys);
  const invalid = keys.filter((k) => !found.has(k));
  if (invalid.length) {
    const err = new Error(`Unknown permission key(s): ${invalid.join(', ')}`);
    err.code = 'INVALID_PERMISSIONS';
    throw err;
  }

  await db.transaction(async (trx) => {
    await trx('role_permissions').where({ role_id: id }).del();
    if (ids.length) {
      await trx('role_permissions')
        .insert(ids.map((permission_id) => ({ tenant_id: tenantId, role_id: id, permission_id })));
    }
  });

  return { ...role, name, description: description || null };
}

async function deleteRole(tenantId, id) {
  const role = await db('roles').where({ tenant_id: tenantId, id }).first();
  if (!role) throw notFound();
  if (role.is_system) throw systemRole();
  await db('roles').where({ id }).del();
  return role;
}

async function getUserAccess(tenantId, userId) {
  const user = await db('users').where({ tenant_id: tenantId, id: userId }).first();
  if (!user) {
    const err = new Error('USER_NOT_FOUND');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  const roles = await db('user_roles')
    .where({ 'user_roles.tenant_id': tenantId, 'user_roles.user_id': userId })
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('roles.is_system', false)
    .select('roles.id', 'roles.name', 'roles.description');

  const permissions = await db('user_permissions')
    .where({ 'user_permissions.tenant_id': tenantId, 'user_permissions.user_id': userId })
    .join('permissions', 'user_permissions.permission_id', 'permissions.id')
    .select('permissions.id', 'permissions.key', 'permissions.label');

  return {
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
    },
    roles,
    permissions,
  };
}

async function setUserAccess(tenantId, userId, { role_ids, permission_keys }) {
  const user = await db('users').where({ tenant_id: tenantId, id: userId }).first();
  if (!user) {
    const err = new Error('USER_NOT_FOUND');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  const validRoles = (role_ids || []).length
    ? await db('roles')
        .where({ tenant_id: tenantId, is_system: false })
        .whereIn('id', role_ids)
        .select('id')
    : [];
  const validRoleIds = new Set(validRoles.map((r) => r.id));

  const { ids, found } = await resolvePermissionIds(tenantId, permission_keys || []);
  const invalid = (permission_keys || []).filter((k) => !found.has(k));
  if (invalid.length) {
    const err = new Error(`Unknown permission key(s): ${invalid.join(', ')}`);
    err.code = 'INVALID_PERMISSIONS';
    throw err;
  }

  await db.transaction(async (trx) => {
    await trx('user_roles').where({ user_id: userId, tenant_id: tenantId }).del();
    if (validRoleIds.size) {
      await trx('user_roles')
        .insert([...validRoleIds].map((role_id) => ({ tenant_id: tenantId, user_id: userId, role_id })));
    }
    await trx('user_permissions').where({ user_id: userId, tenant_id: tenantId }).del();
    if (ids.length) {
      await trx('user_permissions')
        .insert(ids.map((permission_id) => ({ tenant_id: tenantId, user_id: userId, permission_id })));
    }
  });

  return getUserAccess(tenantId, userId);
}

async function getEffectivePermissions(tenantId, user) {
  if (!tenantId || user.role === 'super_admin') {
    return ALL_PERMISSION_KEYS;
  }

  const baseRole = await db('roles')
    .where({ tenant_id: tenantId, name: user.role })
    .first();
  const baseKeys = baseRole
    ? (await db('role_permissions')
        .where({ role_id: baseRole.id })
        .join('permissions', 'role_permissions.permission_id', 'permissions.id')
        .select('permissions.key')).map((r) => r.key)
    : (DEFAULT_ROLE_PERMISSIONS[user.role] || []);

  const set = new Set(baseKeys);

  const customRoleRows = await db('user_roles')
    .where({ tenant_id: tenantId, user_id: user.userId })
    .select('role_id');
  if (customRoleRows.length) {
    const perms = await db('role_permissions')
      .whereIn('role_id', customRoleRows.map((r) => r.role_id))
      .join('permissions', 'role_permissions.permission_id', 'permissions.id')
      .select('permissions.key');
    perms.forEach((p) => set.add(p.key));
  }

  const direct = await db('user_permissions')
    .where({ 'user_permissions.tenant_id': tenantId, 'user_permissions.user_id': user.userId })
    .join('permissions', 'user_permissions.permission_id', 'permissions.id')
    .select('permissions.key');
  direct.forEach((p) => set.add(p.key));

  if (user.role === 'owner' || user.role === 'admin') {
    set.add('roles.manage');
  }

  return [...set];
}

module.exports = {
  SYSTEM_ROLE_NAMES,
  listRoles,
  listPermissions,
  createRole,
  updateRole,
  deleteRole,
  getUserAccess,
  setUserAccess,
  getEffectivePermissions,
};
