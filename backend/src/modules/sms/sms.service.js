const db = require('../../config/database');
const logger = require('../../config/logger');
const settings = require('../settings/settings.service');

const SETTINGS_KEY = 'sms';

// Default configuration. `enabled` is the master switch: while false, NOTHING
// is ever dispatched, even when the queue is processed.
const DEFAULT_CONFIG = {
  enabled: false,
  test_mode: true,
  test_phone: '0932123090',
  daily_limit: 999,
  from_name: 'Mount Olive',
  sender_code: '',
  identifier: '',
};

function apiKey() {
  return process.env.AFRO_SMS_API_KEY || process.env.AFRO_API_KEY || '';
}

// The `from` parameter must be the account's identifier id, which is embedded
// in the API key JWT payload.
function keyIdentifier() {
  const key = apiKey();
  const parts = String(key || '').split('.');
  if (parts.length < 2) return '';
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return json.identifier || '';
  } catch {
    return '';
  }
}

async function getConfig(tenantId) {
  const stored = (await settings.getByKey(tenantId, SETTINGS_KEY)) || {};
  const config = { ...DEFAULT_CONFIG, ...stored };
  return config;
}

async function getPublicConfig(tenantId) {
  const config = await getConfig(tenantId);
  const { ...safe } = config;
  return { ...safe, has_api_key: !!apiKey() };
}

async function setConfig(tenantId, patch) {
  const current = await getConfig(tenantId);
  const next = { ...current, ...patch };
  // Never accept a raw API key in the stored config object.
  delete next.api_key;
  await settings.set(tenantId, SETTINGS_KEY, next);
  return getPublicConfig(tenantId);
}

// Normalise an Ethiopian phone number to 251XXXXXXXXX (AfroMessage's expected form).
function normalizePhone(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('251')) return d;
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 9) return `251${d}`;
  return d;
}

// Parents (unique phone) that should receive a message for a class (or all classes).
async function resolveRecipients(tenantId, classId) {
  const q = db('student_parents as sp')
    .join('users as p', 'p.id', 'sp.parent_id')
    .join('students as s', 's.id', 'sp.student_id')
    .join('users as su', 'su.id', 's.user_id')
    .where('sp.tenant_id', tenantId)
    .where('p.status', 'active')
    .whereNotNull('p.phone')
    .whereRaw("length(regexp_replace(p.phone, '\\D', '', 'g')) >= 9")
    .select(
      'p.id as parent_id',
      'p.phone',
      's.id as student_id',
      'su.first_name as student_first_name',
      'su.last_name as student_last_name'
    );
  if (classId) q.where('s.class_id', classId);

  const rows = await q;
  const byPhone = new Map();
  for (const r of rows) {
    const phone = normalizePhone(r.phone);
    if (!phone) continue;
    if (!byPhone.has(phone)) byPhone.set(phone, r);
  }
  return [...byPhone.values()];
}

async function previewCount(tenantId, classId) {
  const recipients = await resolveRecipients(tenantId, classId);
  return { count: recipients.length };
}

function render(template, ctx) {
  return String(template || '')
    .replace(/\{student\}/gi, ctx.student || 'your child')
    .replace(/\{class\}/gi, ctx.class || 'the class')
    .replace(/\{parent\}/gi, ctx.parent || 'Parent');
}

async function createCampaign(tenantId, userId, data) {
  const config = await getConfig(tenantId);
  const classId = data.class_id || null;
  const recipients = await resolveRecipients(tenantId, classId);

  let className = null;
  if (classId) {
    const cls = await db('classes').where({ tenant_id: tenantId, id: classId }).first();
    className = cls?.name || null;
  }

  const testMode = data.test_mode != null ? !!data.test_mode : config.test_mode;

  const [campaign] = await db('sms_campaigns')
    .insert({
      tenant_id: tenantId,
      created_by: userId,
      title: data.title || 'SMS broadcast',
      message: data.message,
      class_id: classId,
      class_name: className,
      audience: 'parents',
      total_recipients: recipients.length,
      status: 'queued',
      test_mode: testMode,
    })
    .returning('*');

  if (testMode) {
    // Safety: in test mode only ONE message is queued, to the test phone.
    await db('sms_messages').insert({
      tenant_id: tenantId,
      campaign_id: campaign.id,
      phone: normalizePhone(config.test_phone),
      message: render(`[TEST] ${data.message}`, { class: className, student: 'your child' }),
      status: 'queued',
    });
  } else if (recipients.length) {
    const rows = recipients.map((r) => ({
      tenant_id: tenantId,
      campaign_id: campaign.id,
      recipient_user_id: r.parent_id,
      student_id: r.student_id,
      phone: normalizePhone(r.phone),
      message: render(data.message, {
        class: className,
        student: [r.student_first_name, r.student_last_name].filter(Boolean).join(' '),
      }),
      status: 'queued',
    }));
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      await db('sms_messages').insert(rows.slice(i, i + BATCH));
    }
  }

  return campaign;
}

async function listCampaigns(tenantId, { limit = 50 } = {}) {
  return db('sms_campaigns')
    .where({ tenant_id: tenantId })
    .orderBy('created_at', 'desc')
    .limit(Math.min(Number(limit) || 50, 200));
}

async function listMessages(tenantId, campaignId, { limit = 200, status } = {}) {
  const q = db('sms_messages')
    .where({ tenant_id: tenantId, campaign_id: campaignId })
    .orderBy('created_at', 'asc')
    .limit(Math.min(Number(limit) || 200, 1000));
  if (status && status !== 'all') q.where('status', status);
  return q;
}

async function countSentToday(tenantId) {
  const [row] = await db('sms_messages')
    .where({ tenant_id: tenantId, status: 'sent' })
    .whereRaw('sent_at::date = CURRENT_DATE')
    .count('* as c');
  return Number(row?.c || 0);
}

async function stats(tenantId) {
  const config = await getPublicConfig(tenantId);
  const sentToday = await countSentToday(tenantId);
  const [queuedRow] = await db('sms_messages')
    .where({ tenant_id: tenantId, status: 'queued' })
    .count('* as c');
  return {
    sent_today: sentToday,
    queued: Number(queuedRow?.c || 0),
    daily_limit: config.daily_limit,
    remaining_today: Math.max(0, config.daily_limit - sentToday),
    config,
  };
}

async function sendViaAfro(config, { to, message }) {
  const key = apiKey();
  if (!key) return { ok: false, error: 'AFRO_SMS_API_KEY not configured' };
  const base = (process.env.AFRO_SMS_API_BASE || 'https://api.afromessage.com').replace(/\/$/, '');
  const params = new URLSearchParams();
  if (config.from_name) params.set('sender', config.from_name);
  // `from` is the account's identifier/short code and is only needed for
  // accounts with multiple short codes. Omit it unless explicitly configured.
  if (config.identifier) params.set('from', config.identifier);
  params.set('to', to);
  params.set('message', message);
  try {
    const res = await fetch(`${base}/api/send?${params.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
    });
    const raw = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { /* plain text */ }
    const ok = res.ok && parsed && parsed.acknowledge === 'success';
    const errText = parsed?.response?.errors?.join('; ') || parsed?.acknowledge || raw || `HTTP ${res.status}`;
    return { ok, status: res.status, body: parsed, raw, error: ok ? null : String(errText).slice(0, 400) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Dispatch queued messages up to the remaining daily allowance. Respects the
// master `enabled` switch and the 999/day cap.
async function processQueue(tenantId, { limit } = {}) {
  const config = await getConfig(tenantId);
  if (!config.enabled) return { skipped: 'disabled' };

  const sentToday = await countSentToday(tenantId);
  let allowance = Number(config.daily_limit) - sentToday;
  if (limit && limit > 0) allowance = Math.min(allowance, limit);
  if (allowance <= 0) return { skipped: 'daily_limit_reached', sent_today: sentToday };

  const queued = await db('sms_messages')
    .where({ tenant_id: tenantId, status: 'queued' })
    .orderBy('created_at', 'asc')
    .limit(allowance);

  let sent = 0;
  let failed = 0;
  const campaigns = new Set();
  for (const m of queued) {
    const res = await sendViaAfro(config, { to: m.phone, message: m.message });
    campaigns.add(m.campaign_id);
    if (res.ok) {
      sent++;
      await db('sms_messages').where({ id: m.id }).update({
        status: 'sent',
        sent_at: db.fn.now(),
        attempts: (m.attempts || 0) + 1,
        error: null,
      });
    } else {
      failed++;
      await db('sms_messages').where({ id: m.id }).update({
        status: 'failed',
        attempts: (m.attempts || 0) + 1,
        error: res.error || 'send failed',
      });
    }
  }

  for (const cid of campaigns) {
    const [agg] = await db('sms_messages')
      .where({ tenant_id: tenantId, campaign_id: cid })
      .select(
        db.raw("COUNT(*) FILTER (WHERE status = 'sent') as sent"),
        db.raw("COUNT(*) FILTER (WHERE status = 'failed') as failed"),
        db.raw("COUNT(*) FILTER (WHERE status = 'queued') as queued")
      );
    const sentC = Number(agg?.sent || 0);
    const failedC = Number(agg?.failed || 0);
    const queuedC = Number(agg?.queued || 0);
    await db('sms_campaigns').where({ tenant_id: tenantId, id: cid }).update({
      sent_count: sentC,
      failed_count: failedC,
      status: queuedC > 0 ? 'processing' : 'completed',
      updated_at: db.fn.now(),
    });
  }

  logger.info('SMS queue processed', { tenantId, sent, failed, sentToday: sentToday + sent });
  return { sent, failed, sent_today: sentToday + sent, remaining_today: Math.max(0, config.daily_limit - (sentToday + sent)) };
}

async function cancelCampaign(tenantId, campaignId) {
  await db('sms_messages').where({ tenant_id: tenantId, campaign_id: campaignId, status: 'queued' }).update({ status: 'failed', error: 'cancelled' });
  const [row] = await db('sms_campaigns').where({ tenant_id: tenantId, id: campaignId }).update({ status: 'cancelled', updated_at: db.fn.now() }).returning('*');
  return row || null;
}

module.exports = {
  getConfig,
  getPublicConfig,
  setConfig,
  normalizePhone,
  resolveRecipients,
  previewCount,
  createCampaign,
  listCampaigns,
  listMessages,
  countSentToday,
  stats,
  processQueue,
  cancelCampaign,
};