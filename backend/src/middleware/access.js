const { rolesHierarchy } = require('./rbac');
const { getEffectivePermissions } = require('../modules/roles/roles.service');

function requireAccess(roles, permissions = []) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const effectiveRoles = rolesHierarchy[req.user.role] || [req.user.role];
    if (roles.some((role) => effectiveRoles.includes(role))) {
      return next();
    }

    if (permissions.length) {
      try {
        const userPerms = await getEffectivePermissions(
          req.tenant?.id || req.user.tenantId || null,
          req.user
        );
        if (permissions.some((p) => userPerms.includes(p))) {
          return next();
        }
      } catch (err) {
        // fall through to deny
      }
    }

    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
    });
  };
}

module.exports = requireAccess;
