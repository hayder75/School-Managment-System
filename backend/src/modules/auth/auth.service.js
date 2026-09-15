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

const DEMO_ACCOUNTS = {
  owner: ['staff176@mountolive.edu.et'],
  general_manager: ['staff177@mountolive.edu.et'],
  principal: ['staff178@mountolive.edu.et'],
  vice_principal: ['staff179@mountolive.edu.et'],
  quality_director: ['staff180@mountolive.edu.et'],
  admin: ['staff001@mountolive.edu.et'],
  teacher: [
    'teacher.one@mountolive.edu.et',
    'teacher.two@mountolive.edu.et',
    'staff027@mountolive.edu.et',
    'staff026@mountolive.edu.et',
    'staff056@mountolive.edu.et',
    'staff011@mountolive.edu.et',
  ],
  finance: ['staff007@mountolive.edu.et'],
  hr: ['staff099@mountolive.edu.et'],
  cashier: ['staff104@mountolive.edu.et'],
  accountant: ['staff183@mountolive.edu.et'],
  general_services: ['staff181@mountolive.edu.et'],
  shift_coordinator: ['staff182@mountolive.edu.et'],
  security_head: ['staff184@mountolive.edu.et'],
  support: ['staff107@mountolive.edu.et'],
  parent: ['parent0001@mountolive.edu.et'],
  student: ['student0001@mountolive.edu.et'],
};

async function getDevUsers() {
  const order = {};
  const emails = [];
  let i = 0;
  for (const list of Object.values(DEMO_ACCOUNTS)) {
    for (const email of list) {
      order[email] = i;
      emails.push(email);
      i += 1;
    }
  }
  const rows = await db('users')
    .whereIn('email', emails)
    .where({ status: 'active' })
    .select('id', 'email', 'first_name', 'last_name', 'role')
    .then((r) => r.filter((u) => order[u.email] !== undefined).sort((a, b) => order[a.email] - order[b.email]));
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
