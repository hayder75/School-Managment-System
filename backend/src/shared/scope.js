const db = require('../config/database');

// Returns the level groups a user is restricted to, or null for no restriction.
async function getUserScopes(tenantId, userId) {
  if (!tenantId || !userId) return null;
  try {
    const row = await db('users').where({ tenant_id: tenantId, id: userId }).select('scope_level_groups').first();
    const s = row?.scope_level_groups;
    if (Array.isArray(s) && s.length) return s;
    return null;
  } catch {
    return null;
  }
}

function applyClassScopes(query, scopes, column = 'classes.level_group') {
  if (scopes && scopes.length) return query.whereIn(column, scopes);
  return query;
}

module.exports = { getUserScopes, applyClassScopes };
