const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../config/logger');
const db = require('../config/database');

async function auth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No token provided' },
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    logger.error('JWT verification failed', { error: err.message });
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    });
  }

  try {
    const user = await db('users').where({ id: decoded.userId }).select('id', 'role', 'status', 'tenant_id').first();
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Account no longer exists' },
      });
    }
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' },
      });
    }
    req.user = {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: decoded.email,
    };
    next();
  } catch (err) {
    logger.error('Auth middleware DB error', { error: err.message });
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Internal server error' },
    });
  }
}

module.exports = auth;
