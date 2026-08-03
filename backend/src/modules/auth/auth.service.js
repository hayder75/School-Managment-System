const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../../config/database');
const config = require('../../config');
const logger = require('../../config/logger');
const { getEffectivePermissions } = require('../roles/roles.service');

async function login(identifier, password) {
  const raw = String(identifier || '').trim();
  const input = raw.toLowerCase();
  if (!input) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const user = await db('users')
    .where(function () {
      this.where('email', 'ilike', input)
        .orWhere('username', 'ilike', input)
        .orWhere('phone', '=', raw);
    })
    .first();
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
      firstName: user.first_name,
      lastName: user.last_name,
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
    firstName: user.first_name,
    lastName: user.last_name,
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

async function getDevUsers() {
  const roles = ['owner', 'admin', 'teacher', 'finance', 'cashier', 'hr', 'support', 'parent', 'student'];
  const selected = [];
  for (const role of roles) {
    const rows = await db('users')
      .where({ role, status: 'active' })
      .whereNot('role', 'super_admin')
      .select('id', 'email', 'first_name', 'last_name', 'role')
      .orderBy('created_at')
      .limit(role === 'student' ? 3 : role === 'parent' ? 3 : 5);
    selected.push(...rows);
  }
  const rows = selected;
  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.role]) grouped[r.role] = [];
    grouped[r.role].push(r);
  }
  return { users: rows, grouped };
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
