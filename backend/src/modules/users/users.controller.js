const userService = require('./users.service');

const highPrivilegeRoles = ['owner', 'admin'];
// Non-admin staff who may edit other staff, but never touch/hand out admin or
// owner roles.
const restrictedUpdaters = ['hr', 'quality_director', 'principal', 'vice_principal'];

function assertRoleChangeAllowed(req, role) {
  if (!role) return;
  if (restrictedUpdaters.includes(req.user.role) && highPrivilegeRoles.includes(role)) {
    const err = new Error('You cannot assign admin or owner roles');
    err.code = 'FORBIDDEN';
    throw err;
  }
}

async function assertNotLastOwner(tenantId, targetUserId) {
  const target = await userService.findById(tenantId, targetUserId);
  if (!target || target.role !== 'owner') return;

  const ownerCount = await require('../../config/database')('users')
    .where({ tenant_id: tenantId, role: 'owner', status: 'active' })
    .count('* as count')
    .first();
  if (parseInt(ownerCount?.count || 0, 10) <= 1) {
    const err = new Error('Cannot remove the last active owner of the school');
    err.code = 'FORBIDDEN';
    throw err;
  }
}

async function create(req, res) {
  try {
    assertRoleChangeAllowed(req, req.validated.body.role);
    const user = await userService.create(req.tenant.id, req.validated.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: err.message } });
    }
    throw err;
  }
}

async function list(req, res) {
  const { page, limit, role, status, search } = req.query;
  const result = await userService.findAll(req.tenant.id, { page, limit, role, status, search });
  res.json({ success: true, ...result });
}

async function getById(req, res) {
  const user = await userService.findById(req.tenant.id, req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }
  res.json({ success: true, data: user });
}

async function update(req, res) {
  try {
    assertRoleChangeAllowed(req, req.validated.body.role);

    const target = await userService.findById(req.tenant.id, req.params.id);
    if (!target) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    try {
      await assertNotLastOwner(req.tenant.id, req.params.id);
    } catch (err) {
      if (err.code === 'FORBIDDEN') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: err.message } });
      }
      throw err;
    }

    if (restrictedUpdaters.includes(req.user.role) && highPrivilegeRoles.includes(target.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot modify admin or owner accounts' },
      });
    }

    if (req.user.role === 'hr' && req.user.userId === req.params.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'HR cannot modify their own account' },
      });
    }

    // Only admin/owner/GM may change the data scope.
    if (!['admin', 'owner', 'general_manager'].includes(req.user.role)) {
      delete req.validated.body.scope_level_groups;
    }

    const user = await userService.update(req.tenant.id, req.params.id, req.validated.body);
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: err.message } });
    }
    throw err;
  }
}

async function remove(req, res) {
  try {
    const target = await userService.findById(req.tenant.id, req.params.id);
    if (!target) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    try {
      await assertNotLastOwner(req.tenant.id, req.params.id);
    } catch (err) {
      if (err.code === 'FORBIDDEN') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: err.message } });
      }
      throw err;
    }

    if (restrictedUpdaters.includes(req.user.role) && highPrivilegeRoles.includes(target.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You cannot delete admin or owner accounts' },
      });
    }

    if (req.user.userId === req.params.id) {
      return res.status(400).json({
        success: false,
        error: { code: 'SELF_DELETE', message: 'You cannot delete your own account' },
      });
    }

    await userService.remove(req.tenant.id, req.params.id);
    res.json({ success: true, data: null });
  } catch (err) {
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: err.message } });
    }
    throw err;
  }
}

async function updateCompensation(req, res) {
  const target = await userService.findById(req.tenant.id, req.params.id);
  if (!target) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
    });
  }
  const user = await userService.update(req.tenant.id, req.params.id, req.validated.body);
  res.json({ success: true, data: user });
}

module.exports = { create, list, getById, update, updateCompensation, remove };
