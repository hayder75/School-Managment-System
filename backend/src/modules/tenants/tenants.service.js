const db = require('../../config/database');
const bcrypt = require('bcrypt');
const { paginatedResult } = require('../../shared/pagination');

async function create(data) {
  const { owner_email, owner_first_name, owner_last_name, ...tenantData } = data;

  const [tenant] = await db('tenants').insert(tenantData).returning('*');

  if (owner_email) {
    const passwordHash = await bcrypt.hash('school123', 10);
    await db('users').insert({
      tenant_id: tenant.id,
      email: owner_email,
      password_hash: passwordHash,
      first_name: owner_first_name || 'School',
      last_name: owner_last_name || 'Owner',
      role: 'owner',
      status: 'active',
    });
  }

  return tenant;
}

async function findAll(page = 1, limit = 20) {
  const query = db('tenants').orderBy('created_at', 'desc');
  return paginatedResult(query, page, limit);
}

async function findById(id) {
  return db('tenants').where({ id }).first();
}

async function update(id, data) {
  data.updated_at = db.fn.now();
  const [tenant] = await db('tenants').where({ id }).update(data).returning('*');
  return tenant;
}

async function remove(id) {
  return db('tenants').where({ id }).del();
}

async function getTenantDetail(id) {
  const tenant = await db('tenants').where({ id }).first();
  if (!tenant) return null;

  const [userCount] = await db('users').where({ tenant_id: id }).count('* as count');
  const [activeUserCount] = await db('users').where({ tenant_id: id, status: 'active' }).count('* as count');
  const [branchCount] = await db('branches').where({ tenant_id: id }).count('* as count');
  const [studentCount] = await db('users').where({ tenant_id: id, role: 'student' }).count('* as count');
  const [teacherCount] = await db('users').where({ tenant_id: id, role: 'teacher' }).count('* as count');
  const [adminCount] = await db('users').where({ tenant_id: id, role: 'admin' }).count('* as count');

  const roleBreakdown = await db('users')
    .select('role')
    .count('* as count')
    .where({ tenant_id: id })
    .groupBy('role')
    .orderBy('role');

  const branches = await db('branches').where({ tenant_id: id }).select('id', 'name', 'is_head_office', 'phone');

  return {
    ...tenant,
    totalUsers: Number(userCount.count),
    activeUsers: Number(activeUserCount.count),
    branches: Number(branchCount.count),
    students: Number(studentCount.count),
    teachers: Number(teacherCount.count),
    admins: Number(adminCount.count),
    branchList: branches,
    roleBreakdown,
  };
}

async function getSystemStats() {
  const [tenantCount] = await db('tenants').count('* as count');
  const [branchCount] = await db('branches').count('* as count');
  const [userCount] = await db('users').count('* as count');
  const [activeUserCount] = await db('users').where('status', 'active').count('* as count');
  const [studentCount] = await db('users').where('role', 'student').count('* as count');
  const [teacherCount] = await db('users').where('role', 'teacher').count('* as count');
  const [superAdminCount] = await db('users').where('role', 'super_admin').whereNull('tenant_id').count('* as count');

  const planBreakdown = await db('tenants')
    .select('subscription_plan')
    .count('* as count')
    .groupBy('subscription_plan');

  return {
    schools: Number(tenantCount.count),
    branches: Number(branchCount.count),
    totalUsers: Number(userCount.count),
    activeUsers: Number(activeUserCount.count),
    students: Number(studentCount.count),
    teachers: Number(teacherCount.count),
    superAdmins: Number(superAdminCount.count),
    planBreakdown,
  };
}

module.exports = { create, findAll, findById, update, remove, getTenantDetail, getSystemStats };
