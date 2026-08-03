const rolesHierarchy = {
  super_admin: ['super_admin', 'owner', 'admin', 'teacher', 'student', 'parent', 'hr', 'finance', 'cashier', 'support'],
  owner: ['owner', 'admin'],
  admin: ['admin'],
  teacher: ['teacher'],
  student: ['student'],
  parent: ['parent'],
  hr: ['hr'],
  finance: ['finance'],
  cashier: ['cashier'],
};

function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const userRole = req.user.role;
    const effectiveRoles = rolesHierarchy[userRole] || [userRole];
    const hasAccess = allowedRoles.some((role) => effectiveRoles.includes(role));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    next();
  };
}

module.exports = rbac;
module.exports.rolesHierarchy = rolesHierarchy;
