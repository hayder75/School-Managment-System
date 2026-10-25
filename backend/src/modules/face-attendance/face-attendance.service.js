const crypto = require('crypto');
const db = require('../../config/database');
const config = require('../../config');
const logger = require('../../config/logger');
const settingsService = require('../settings/settings.service');

const SETTINGS_KEY = 'face_attendance';
const DESCRIPTOR_LENGTH = 128;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const COOLDOWN_SECONDS = 60;

const STAFF_ROLES = [
  'teacher', 'hr', 'admin', 'owner', 'finance', 'cashier', 'accountant',
  'support', 'general_services', 'security_head', 'shift_coordinator',
  'principal', 'vice_principal', 'quality_director', 'general_manager',
];

const DEFAULT_SETTINGS = {
  match_threshold: 0.5,
  match_margin: 0.05,
  liveness_required: true,
  am_start: '08:00',
  pm_start: '13:30',
  late_grace_minutes: 30,
  timezone: 'Africa/Addis_Ababa',
};

// ---------- settings ----------
async function getSettings(tenantId) {
  const stored = (await settingsService.getByKey(tenantId, SETTINGS_KEY)) || {};
  return { ...DEFAULT_SETTINGS, ...stored };
}

async function updateSettings(tenantId, patch = {}) {
  const current = await getSettings(tenantId);
  const next = { ...current };
  if (patch.match_threshold != null) next.match_threshold = Number(patch.match_threshold);
  if (patch.match_margin != null) next.match_margin = Number(patch.match_margin);
  if (patch.liveness_required != null) next.liveness_required = !!patch.liveness_required;
  if (patch.am_start) next.am_start = String(patch.am_start);
  if (patch.pm_start) next.pm_start = String(patch.pm_start);
  if (patch.late_grace_minutes != null) next.late_grace_minutes = Number(patch.late_grace_minutes) || 0;
  if (patch.timezone) next.timezone = String(patch.timezone);
  await settingsService.set(tenantId, SETTINGS_KEY, next);
  return next;
}

// ---------- encryption (AES-256-GCM at rest) ----------
let cachedKey = null;
function encryptionKey() {
  if (cachedKey) return cachedKey;
  const raw = process.env.FACE_ENCRYPTION_KEY;
  if (raw && raw.trim()) {
    const t = raw.trim();
    const buf = /^[0-9a-fA-F]{64}$/.test(t) ? Buffer.from(t, 'hex') : Buffer.from(t, 'base64');
    if (buf.length === 32) { cachedKey = buf; return buf; }
  }
  cachedKey = Buffer.from(
    crypto.hkdfSync('sha256', Buffer.from(config.jwt.secret, 'utf8'), Buffer.from('sms-face', 'utf8'), Buffer.from('at-rest-v1', 'utf8'), 32)
  );
  return cachedKey;
}

function encryptDescriptor(descriptor) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const buf = Buffer.from(new Float32Array(descriptor).buffer);
  const enc = Buffer.concat([cipher.update(buf), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

function decryptDescriptor(payload) {
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < IV_BYTES + TAG_BYTES) throw new Error('Malformed descriptor');
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const data = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(data), decipher.final()]);
  const floats = new Float32Array(out.buffer, out.byteOffset, Math.floor(out.length / 4));
  return Array.from(floats);
}

// ---------- time helpers (school timezone) ----------
function nowInTz(tz) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || DEFAULT_SETTINGS.timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const p = {};
  for (const part of fmt.formatToParts(new Date())) p[part.type] = part.value;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

function toMin(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function computeStatus(session, time, settings) {
  const start = session === 'pm' ? settings.pm_start : settings.am_start;
  const grace = Number(settings.late_grace_minutes) || 0;
  const lateMinutes = toMin(time) - (toMin(start) + grace);
  return lateMinutes > 0
    ? { status: 'late', late_minutes: lateMinutes }
    : { status: 'present', late_minutes: 0 };
}

// ---------- matching ----------
function euclidean(a, b) {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) { const d = a[i] - b[i]; sum += d * d; }
  return Math.sqrt(sum);
}

function isValidDescriptor(d) {
  return Array.isArray(d) && d.length === DESCRIPTOR_LENGTH && d.every((v) => typeof v === 'number' && Number.isFinite(v));
}

function findBestMatch(descriptor, templates, { threshold, margin }) {
  if (!templates.length) return null;
  const perUser = new Map();
  for (const t of templates) {
    const dist = euclidean(descriptor, t.descriptor);
    const cur = perUser.get(t.userId);
    if (!cur || dist < cur.distance) perUser.set(t.userId, { distance: dist, templateId: t.id });
  }
  const ranked = [...perUser.entries()].sort((a, b) => a[1].distance - b[1].distance);
  if (!ranked.length) return null;
  const [userId, best] = ranked[0];
  const runnerUp = ranked[1]?.[1].distance ?? null;
  if (best.distance > threshold) return null;
  if (runnerUp !== null && runnerUp - best.distance < margin) return null;
  return { userId, distance: best.distance, runnerUp };
}

// ---------- data ----------
async function listStaff(tenantId, { search } = {}) {
  const q = db('users')
    .where({ 'users.tenant_id': tenantId, 'users.status': 'active' })
    .whereIn('users.role', STAFF_ROLES)
    .select(
      'users.id', 'users.first_name', 'users.middle_name', 'users.last_name',
      'users.role', 'users.job_title', 'users.email', 'users.phone',
      db.raw('(select count(*) from staff_face_templates t where t.user_id = users.id and t.tenant_id = users.tenant_id) as enrolled_count')
    )
    .orderBy('users.first_name', 'asc')
    .limit(200);
  if (search) {
    const s = `%${String(search).trim()}%`;
    q.where(function () {
      this.where('users.first_name', 'ilike', s)
        .orWhere('users.last_name', 'ilike', s)
        .orWhere('users.email', 'ilike', s)
        .orWhere('users.job_title', 'ilike', s);
    });
  }
  const rows = await q;
  return rows.map((r) => ({ ...r, enrolled_count: Number(r.enrolled_count) || 0 }));
}

async function enroll(tenantId, userId, actorId, descriptors) {
  const list = Array.isArray(descriptors) ? descriptors : [];
  const valid = list.filter(isValidDescriptor);
  if (!valid.length) {
    const err = new Error('No valid face descriptors provided');
    err.code = 'VALIDATION';
    throw err;
  }
  const staff = await db('users').where({ tenant_id: tenantId, id: userId }).first();
  if (!staff) {
    const err = new Error('Staff not found');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const rows = valid.map((d) => ({
    tenant_id: tenantId,
    user_id: userId,
    descriptor_cipher: encryptDescriptor(d),
    quality: 1,
    source: 'MANUAL',
    created_by: actorId,
  }));
  await db('staff_face_templates').insert(rows);

  // Keep at most 8 samples per person.
  const all = await db('staff_face_templates')
    .where({ tenant_id: tenantId, user_id: userId })
    .orderBy('created_at', 'desc')
    .select('id');
  if (all.length > 8) {
    const drop = all.slice(8).map((r) => r.id);
    await db('staff_face_templates').whereIn('id', drop).del();
  }
  return { user_id: userId, enrolled: valid.length };
}

async function deleteTemplates(tenantId, userId) {
  const n = await db('staff_face_templates').where({ tenant_id: tenantId, user_id: userId }).del();
  return { deleted: n };
}

async function loadTemplates(tenantId) {
  const rows = await db('staff_face_templates as t')
    .join('users as u', 'u.id', 't.user_id')
    .where({ 't.tenant_id': tenantId, 'u.status': 'active' })
    .whereIn('u.role', STAFF_ROLES)
    .select('t.id', 't.user_id', 't.descriptor_cipher');
  const out = [];
  for (const r of rows) {
    try { out.push({ id: r.id, userId: r.user_id, descriptor: decryptDescriptor(r.descriptor_cipher) }); }
    catch (err) { logger.error('Face template decrypt failed', { id: r.id, error: err.message }); }
  }
  return out;
}

async function writeLog(tenantId, { userId, session, action, matched, distance, liveness, ip, deviceInfo }) {
  try {
    await db('face_attendance_logs').insert({
      tenant_id: tenantId,
      user_id: userId || null,
      session: session || null,
      action,
      matched: !!matched,
      match_distance: distance ?? null,
      liveness_passed: !!liveness,
      ip: ip || null,
      device_info: deviceInfo || null,
    });
  } catch (err) {
    logger.error('Face attendance log failed', { error: err.message });
  }
}

async function scan(tenantId, actorId, { descriptor, session = 'am', livenessPassed, ip, deviceInfo }) {
  const settings = await getSettings(tenantId);
  const sess = session === 'pm' ? 'pm' : 'am';
  const now = nowInTz(settings.timezone);

  if (!isValidDescriptor(descriptor)) {
    const err = new Error('Invalid face descriptor');
    err.code = 'VALIDATION';
    throw err;
  }
  if (settings.liveness_required && !livenessPassed) {
    await writeLog(tenantId, { session: sess, action: 'LIVENESS_FAIL', matched: false, liveness: false, ip, deviceInfo });
    return { matched: false, reason: 'LIVENESS', message: 'Liveness check failed. Please blink and try again.' };
  }

  const templates = await loadTemplates(tenantId);
  const match = findBestMatch(descriptor, templates, {
    threshold: Number(settings.match_threshold) || 0.5,
    margin: Number(settings.match_margin) || 0.05,
  });

  if (!match) {
    await writeLog(tenantId, { session: sess, action: 'NO_MATCH', matched: false, liveness: livenessPassed, ip, deviceInfo });
    return { matched: false, reason: 'NO_MATCH', message: 'Face not recognised.' };
  }

  const staff = await db('users').where({ tenant_id: tenantId, id: match.userId })
    .select('id', 'first_name', 'middle_name', 'last_name', 'role', 'job_title').first();
  if (!staff) {
    return { matched: false, reason: 'NO_MATCH', message: 'Face not recognised.' };
  }

  const existing = await db('staff_attendance')
    .where({ tenant_id: tenantId, staff_id: match.userId, date: now.date, session: sess })
    .first();

  if (existing && ['leave', 'emergency'].includes(existing.status)) {
    await writeLog(tenantId, { userId: staff.id, session: sess, action: 'BLOCKED_LEAVE', matched: true, distance: match.distance, liveness: livenessPassed, ip, deviceInfo });
    return {
      matched: true, staff: publicStaff(staff), action: 'BLOCKED_LEAVE', session: sess,
      status: existing.status, time: now.time,
      message: `${firstName(staff)} is on ${existing.status}.`,
    };
  }

  const cooldownMs = COOLDOWN_SECONDS * 1000;
  const updatedAt = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;

  if (existing && existing.check_in && existing.check_out) {
    await writeLog(tenantId, { userId: staff.id, session: sess, action: 'DUPLICATE', matched: true, distance: match.distance, liveness: livenessPassed, ip, deviceInfo });
    return { matched: true, staff: publicStaff(staff), action: 'DUPLICATE', session: sess, status: existing.status, time: now.time, message: `${firstName(staff)} already recorded for the ${sess.toUpperCase()}.` };
  }

  if (existing && existing.check_in && !existing.check_out) {
    if (Date.now() - updatedAt < cooldownMs) {
      return { matched: true, staff: publicStaff(staff), action: 'DUPLICATE', session: sess, status: existing.status, time: now.time, message: `${firstName(staff)} already checked in.` };
    }
    const [row] = await db('staff_attendance').where({ id: existing.id }).update({
      check_out: now.time, recorded_by: actorId, updated_at: db.fn.now(),
    }).returning('*');
    await writeLog(tenantId, { userId: staff.id, session: sess, action: 'CHECK_OUT', matched: true, distance: match.distance, liveness: livenessPassed, ip, deviceInfo });
    return { matched: true, staff: publicStaff(staff), action: 'CHECK_OUT', session: sess, status: row.status, time: now.time, message: `${firstName(staff)} checked out (${sess.toUpperCase()}).` };
  }

  // No usable record yet -> mark present/late and check in.
  const { status, late_minutes } = computeStatus(sess, now.time, settings);
  let row;
  if (existing) {
    [row] = await db('staff_attendance').where({ id: existing.id }).update({
      status, check_in: now.time, late_minutes, recorded_by: actorId, source: 'face', updated_at: db.fn.now(),
    }).returning('*');
  } else {
    [row] = await db('staff_attendance').insert({
      tenant_id: tenantId,
      staff_id: match.userId,
      date: now.date,
      session: sess,
      status,
      check_in: now.time,
      late_minutes,
      source: 'face',
      recorded_by: actorId,
    }).returning('*');
  }

  await writeLog(tenantId, { userId: staff.id, session: sess, action: 'CHECK_IN', matched: true, distance: match.distance, liveness: livenessPassed, ip, deviceInfo });
  return {
    matched: true,
    staff: publicStaff(staff),
    action: 'CHECK_IN',
    session: sess,
    status,
    late_minutes,
    time: now.time,
    distance: Math.round(match.distance * 1000) / 1000,
    message: `${firstName(staff)} checked in (${sess.toUpperCase()}) - ${status === 'late' ? `late ${late_minutes} min` : 'on time'}.`,
  };
}

function publicStaff(s) {
  return {
    id: s.id,
    first_name: s.first_name,
    middle_name: s.middle_name || '',
    last_name: s.last_name,
    role: s.role,
    job_title: s.job_title || '',
  };
}
function firstName(s) { return s.first_name || 'Staff'; }

async function setException(tenantId, actorId, { staffId, session = 'am', status }) {
  const st = ['leave', 'emergency'].includes(status) ? status : null;
  if (!staffId || !st) {
    const err = new Error('staffId and status (leave|emergency) are required');
    err.code = 'VALIDATION';
    throw err;
  }
  const settings = await getSettings(tenantId);
  const now = nowInTz(settings.timezone);
  const sess = session === 'pm' ? 'pm' : 'am';
  const existing = await db('staff_attendance')
    .where({ tenant_id: tenantId, staff_id: staffId, date: now.date, session: sess }).first();
  let row;
  if (existing) {
    [row] = await db('staff_attendance').where({ id: existing.id }).update({
      status: st, source: 'manual', recorded_by: actorId, updated_at: db.fn.now(),
    }).returning('*');
  } else {
    [row] = await db('staff_attendance').insert({
      tenant_id: tenantId, staff_id: staffId, date: now.date, session: sess,
      status: st, source: 'manual', recorded_by: actorId,
    }).returning('*');
  }
  await writeLog(tenantId, { userId: staffId, session: sess, action: 'EXCEPTION', matched: true, liveness: true });
  return row;
}

async function today(tenantId) {
  const settings = await getSettings(tenantId);
  const now = nowInTz(settings.timezone);
  const attendance = await db('staff_attendance as sa')
    .join('users as u', 'u.id', 'sa.staff_id')
    .where({ 'sa.tenant_id': tenantId, 'sa.date': now.date })
    .select(
      'sa.id', 'sa.staff_id', 'sa.session', 'sa.status', 'sa.check_in', 'sa.check_out',
      'sa.late_minutes', 'sa.source', 'u.first_name', 'u.middle_name', 'u.last_name', 'u.role'
    )
    .orderBy('sa.updated_at', 'desc')
    .limit(200);
  const scans = await db('face_attendance_logs')
    .where({ tenant_id: tenantId })
    .whereRaw('created_at >= CURRENT_DATE')
    .orderBy('created_at', 'desc')
    .limit(20);
  return { date: now.date, time: now.time, session: toMin(now.time) < toMin('12:00') ? 'am' : 'pm', attendance, scans, settings };
}

module.exports = {
  STAFF_ROLES, DEFAULT_SETTINGS, DESCRIPTOR_LENGTH,
  getSettings, updateSettings,
  listStaff, enroll, deleteTemplates, scan, setException, today,
  encryptDescriptor, decryptDescriptor,
};