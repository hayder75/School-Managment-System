const rateLimit = require('express-rate-limit');

const defaults = {
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
};

function tenantRateLimiter(maxPerMinute = 100) {
  return rateLimit({ ...defaults, max: maxPerMinute });
}

function authRateLimiter() {
  return rateLimit({ max: 100, windowMs: 60 * 1000, standardHeaders: true, legacyHeaders: false });
}

module.exports = { tenantRateLimiter, authRateLimiter };
