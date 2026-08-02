const rolesService = require('./roles.service');

function tenantRequired(req, res) {
  if (!req.tenant) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No school context' } });
    return false;
  }
  return true;
}

async function myPermissions(req, res) {
  const perms = await rolesService.getEffectivePermissions(req.tenant?.id || null, req.user);
  res.json({ success: true, data: { permissions: perms } });
}

async function listRoles(req, res) {
  if (!tenantRequired(req, res)) return;
  const roles = await rolesService.listRoles(req.tenant.id);
  res.json({ success: true, data: roles });
}

async function listPermissions(req, res) {
  if (!tenantRequired(req, res)) return;
  const perms = await rolesService.listPermissions(req.tenant.id);
  res.json({ success: true, data: perms });
}

async function createRole(req, res) {
  if (!tenantRequired(req, res)) return;
  try {
    const role = await rolesService.createRole(req.tenant.id, req.validated.body);
    res.status(201).json({ success: true, data: role });
  } catch (err) {
    if (err.code === 'INVALID_PERMISSIONS') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PERMISSIONS', message: err.message } });
    }
    throw err;
  }
}

async function updateRole(req, res) {
  if (!tenantRequired(req, res)) return;
  try {
    const role = await rolesService.updateRole(req.tenant.id, req.params.id, req.validated.body);
    res.json({ success: true, data: role });
  } catch (err) {
    if (err.code === 'ROLE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' } });
    }
    if (err.code === 'INVALID_PERMISSIONS') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PERMISSIONS', message: err.message } });
    }
    throw err;
  }
}

async function deleteRole(req, res) {
  if (!tenantRequired(req, res)) return;
  try {
    await rolesService.deleteRole(req.tenant.id, req.params.id);
    res.json({ success: true, data: null });
  } catch (err) {
    if (err.code === 'ROLE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'ROLE_NOT_FOUND', message: 'Role not found' } });
    }
    if (err.code === 'ROLE_IS_SYSTEM') {
      return res.status(400).json({ success: false, error: { code: 'ROLE_IS_SYSTEM', message: err.message } });
    }
    throw err;
  }
}

async function getUserAccess(req, res) {
  if (!tenantRequired(req, res)) return;
  try {
    const result = await rolesService.getUserAccess(req.tenant.id, req.params.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }
    throw err;
  }
}

async function setUserAccess(req, res) {
  if (!tenantRequired(req, res)) return;
  try {
    const result = await rolesService.setUserAccess(req.tenant.id, req.params.userId, req.validated.body);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }
    if (err.code === 'INVALID_PERMISSIONS') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PERMISSIONS', message: err.message } });
    }
    throw err;
  }
}

module.exports = {
  myPermissions,
  listRoles,
  listPermissions,
  createRole,
  updateRole,
  deleteRole,
  getUserAccess,
  setUserAccess,
};
