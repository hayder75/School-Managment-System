const crypto = require('crypto');
const db = require('../../config/database');
const reportingService = require('./reporting.service');
const excelService = require('../../services/excel.service');

const PII_KEY = /(^name$|email|phone|first_name|last_name|full_name|national_id|student_number|emergency_contact)/i;

// Recursively remove personal identifiers unless the sharer opted in.
function sanitize(value, includeNames) {
  if (includeNames) return value;
  if (Array.isArray(value)) return value.map((v) => sanitize(v, includeNames));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (PII_KEY.test(k)) continue;
      out[k] = sanitize(v, includeNames);
    }
    return out;
  }
  return value;
}

function makeToken() {
  return crypto.randomBytes(24).toString('base64url');
}

async function createShare(tenantId, userId, { reportId, title, filters = {}, expiresAt, includeNames = false }) {
  const payload = await reportingService.buildReport(reportId, tenantId, userId, filters);
  if (!payload) {
    const err = new Error('Unknown report');
    err.code = 'UNKNOWN_REPORT';
    throw err;
  }
  // Attach capped detail tables so the shared page lists rows too.
  try {
    const sheets = await excelService.listTables(reportId, tenantId, userId, filters);
    payload.tables = sheets.map((s) => ({
      table: s.name,
      columns: s.columns.map((c) => ({ header: c.header, key: c.key })),
      rows: s.rows.slice(0, 300),
      total: s.rows.length,
      truncated: s.rows.length > 300,
    }));
  } catch {
    payload.tables = [];
  }
  const token = makeToken();
  const [row] = await db('report_shares')
    .insert({
      tenant_id: tenantId,
      token,
      report_id: reportId,
      title: title || reportId,
      filters,
      payload: sanitize(payload, includeNames),
      include_names: !!includeNames,
      created_by: userId || null,
      expires_at: expiresAt || null,
    })
    .returning('id');
  return { id: row.id, token };
}

async function getPublicShare(token) {
  const share = await db('report_shares').where({ token }).first();
  if (!share) return null;
  if (share.revoked) return { revoked: true };
  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) return { expired: true };
  await db('report_shares').where({ id: share.id }).increment('views', 1);
  return {
    report_id: share.report_id,
    title: share.title,
    filters: share.filters,
    payload: share.payload,
    include_names: share.include_names,
    created_at: share.created_at,
    expires_at: share.expires_at,
    views: share.views + 1,
  };
}

const ADMIN_TIER = ['admin', 'owner', 'general_manager', 'principal', 'vice_principal'];

async function listShares(tenantId, userId, role) {
  let q = db('report_shares').where({ tenant_id: tenantId });
  if (!ADMIN_TIER.includes(role)) q = q.where({ created_by: userId });
  return q
    .select('id', 'token', 'report_id', 'title', 'include_names', 'expires_at', 'revoked', 'views', 'created_at')
    .orderBy('created_at', 'desc')
    .limit(100);
}

async function revokeShare(tenantId, id, userId, role) {
  const q = db('report_shares').where({ tenant_id: tenantId, id });
  if (!['admin', 'owner'].includes(role)) q.andWhere({ created_by: userId });
  return q.update({ revoked: true });
}

module.exports = { createShare, getPublicShare, listShares, revokeShare, sanitize };
