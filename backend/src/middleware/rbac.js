const rolesHierarchy = {
  super_admin: ['super_admin', 'owner', 'admin', 'general_manager', 'principal', 'vice_principal', 'quality_director', 'teacher', 'student', 'parent', 'hr', 'finance', 'cashier', 'support', 'general_services', 'security_head', 'accountant', 'shift_coordinator'],
  owner: ['owner', 'admin'],
  admin: ['admin'],
  general_manager: ['general_manager'],
  principal: ['principal', 'vice_principal'],
  vice_principal: ['vice_principal'],
  quality_director: ['quality_director'],
  teacher: ['teacher'],
  student: ['student'],
  parent: ['parent'],
  hr: ['hr'],
  finance: ['finance'],
  cashier: ['cashier'],
  support: ['support'],
  general_services: ['general_services'],
  security_head: ['security_head'],
  accountant: ['accountant'],
  shift_coordinator: ['shift_coordinator', 'teacher'],
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
