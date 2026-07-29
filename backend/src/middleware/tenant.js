const db = require('../config/database');
const logger = require('../config/logger');

async function tenant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  if (req.user.role === 'super_admin') {
    req.tenant = null;
    return next();
  }

  const tenantId = req.user.tenantId;
  if (!tenantId) {
    return res.status(403).json({
      success: false,
      error: { code: 'NO_TENANT', message: 'No tenant associated with this user' },
    });
  }

  try {
    const tenant = await db('tenants').where({ id: tenantId, status: 'active' }).first();
    if (!tenant) {
      return res.status(403).json({
        success: false,
        error: { code: 'TENANT_INACTIVE', message: 'School not found or inactive' },
      });
    }
    req.tenant = tenant;
    next();
  } catch (err) {
    logger.error('Tenant middleware error', { error: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Internal server error' },
    });
  }
}

module.exports = tenant;
