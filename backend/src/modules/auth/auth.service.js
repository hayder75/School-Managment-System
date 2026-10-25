const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../../config/database');
const config = require('../../config');
const logger = require('../../config/logger');
const { getEffectivePermissions } = require('../roles/roles.service');

// Parents have no stored name; show their phone instead of an empty/"?" label.
function nameParts(user) {
  const first = (user.first_name || '').trim();
  const last = (user.last_name || '').trim();
  if (first || last) return { firstName: first, lastName: last };
  return { firstName: (user.phone || user.username || 'User'), lastName: '' };
}

async function login(identifier, password) {
  const raw = String(identifier || '').trim();
  const input = raw.toLowerCase();
  if (!input) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const digits = (() => {
    let d = raw.replace(/\D/g, '');
    if (d.startsWith('251')) d = d.slice(3);
    if (d.startsWith('0')) d = d.slice(1);
    return d.length >= 7 ? d : null;
  })();

// Staff take priority over parent/student accounts when a phone number is
  // shared, so a staff member logging in with their phone never lands on a
  // parent or student account.
  const staffFirst = "CASE WHEN role IN ('parent','student') THEN 1 ELSE 0 END ASC, created_at ASC";

  let user = null;

  // Phone-like input: prefer a staff account over a parent/student sharing the
  // same number. Parents still log in here when the number belongs only to them.
  if (digits) {
    user = await db('users')
      .where('phone', '=', raw)
      .orderByRaw(staffFirst)
      .first();
  }

  // Username / email login.
  if (!user) {
    user = await db('users')
      .where(function () {
        this.whereILike('email', input).orWhereILike('username', input);
      })
      .first();
  }

  // Flexible phone match (09… / 9… / 2519…), staff first, only when unambiguous.
  if (!user && digits) {
    const candidates = await db('users')
      .whereRaw("regexp_replace(coalesce(phone, ''), '\\D', '', 'g') LIKE ?", [`%${digits}%`])
      .orderByRaw(staffFirst)
      .limit(2);
    user = candidates[0] || null;
  }

  if (!user || !user.password_hash) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (user.status !== 'active') {
    throw new Error('ACCOUNT_INACTIVE');
  }

  await db('users').where({ id: user.id }).update({ last_login: db.fn.now() });

  const token = jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const permissions = await getEffectivePermissions(user.tenant_id, {
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: nameParts(user).firstName,
      middleName: user.middle_name || '',
      lastName: nameParts(user).lastName,
      role: user.role,
      tenantId: user.tenant_id,
      avatar: user.avatar,
      phone: user.phone,
      username: user.username,
      permissions,
    },
  };
}

async function getMe(userId) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new Error('USER_NOT_FOUND');

  const permissions = await getEffectivePermissions(user.tenant_id, {
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
  });

  return {
    id: user.id,
    email: user.email,
    firstName: nameParts(user).firstName,
    middleName: user.middle_name || '',
    lastName: nameParts(user).lastName,
    role: user.role,
    tenantId: user.tenant_id,
    avatar: user.avatar,
    phone: user.phone,
    username: user.username,
    status: user.status,
    permissions,
  };
}

async function setPassword(token, password) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    throw new Error('INVALID_TOKEN');
  }

  if (payload.type !== 'invitation') {
    throw new Error('INVALID_TOKEN');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db('users').where({ id: payload.userId }).update({
    password_hash: passwordHash,
    status: 'active',
  });

  return { userId: payload.userId };
}

const ROLE_ORDER = [
  'owner', 'admin', 'general_manager', 'principal', 'vice_principal', 'quality_director',
  'hr', 'finance', 'cashier', 'accountant', 'general_services', 'shift_coordinator',
  'security_head', 'teacher', 'librarian', 'support', 'face_attendance', 'student', 'parent',
];

async function getDevUsers() {
  const tenant = await db('tenants').orderBy('created_at').first();
  if (!tenant) return { users: [], grouped: {} };

  const rows = await db('users')
    .where({ status: 'active', tenant_id: tenant.id })
    .whereIn('role', ROLE_ORDER)
    .select('id', 'username', 'email', 'first_name', 'last_name', 'role', 'created_at');

  const byRole = {};
  for (const r of rows) {
    if (!byRole[r.role]) byRole[r.role] = [];
    byRole[r.role].push(r);
  }

  const users = [];
  for (const role of ROLE_ORDER) {
    const list = byRole[role] || [];
    if (!list.length) continue;
    list.sort((a, b) => {
      const ad = /^demo[._]/i.test(a.username || '') ? 0 : 1;
      const bd = /^demo[._]/i.test(b.username || '') ? 0 : 1;
      if (ad !== bd) return ad - bd;
      return new Date(a.created_at) - new Date(b.created_at);
    });
    const u = list[0];
    users.push({
      id: u.id,
      username: u.username,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
    });
  }

  const grouped = {};
  for (const u of users) {
    if (!grouped[u.role]) grouped[u.role] = [];
    grouped[u.role].push(u);
  }
  return { users, grouped };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new Error('USER_NOT_FOUND');

  if (!user.password_hash) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const hash = await bcrypt.hash(newPassword, 10);
  await db('users').where({ id: userId }).update({ password_hash: hash });
  return { userId };
}

async function forgotPassword(email) {
  const user = await db('users').where({ email }).first();
  if (!user) return;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db('password_reset_tokens').insert({ user_id: user.id, token, expires_at: expiresAt });
  logger.info(`Password reset token for ${email}: ${token}`);
}

async function resetPassword(token, password) {
  const record = await db('password_reset_tokens').where({ token, used: false }).first();
  if (!record || new Date(record.expires_at) < new Date()) throw new Error('INVALID_TOKEN');
  const hash = await bcrypt.hash(password, 10);
  await db('users').where({ id: record.user_id }).update({ password_hash: hash });
  await db('password_reset_tokens').where({ id: record.id }).update({ used: true });
}

module.exports = { login, getMe, setPassword, getDevUsers, changePassword, forgotPassword, resetPassword };
