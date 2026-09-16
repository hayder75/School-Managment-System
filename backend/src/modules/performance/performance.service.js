const db = require('../../config/database');

async function listCriteria(tenantId) {
  return db('staff_performance_criteria').where({ tenant_id: tenantId }).orderBy('sort_order').orderBy('name');
}

async function createCriteria(tenantId, data) {
  const [row] = await db('staff_performance_criteria').insert({
    tenant_id: tenantId,
    name: data.name,
    description: data.description || null,
    weight: data.weight ?? 0,
    is_active: data.is_active !== false,
    sort_order: data.sort_order ?? 0,
  }).returning('*');
  return row;
}

async function updateCriteria(tenantId, id, data) {
  const patch = {};
  for (const k of ['name', 'description', 'weight', 'is_active', 'sort_order']) {
    if (data[k] !== undefined) patch[k] = data[k];
  }
  patch.updated_at = db.fn.now();
  const [row] = await db('staff_performance_criteria').where({ tenant_id: tenantId, id }).update(patch).returning('*');
  return row;
}

async function removeCriteria(tenantId, id) {
  return db('staff_performance_criteria').where({ tenant_id: tenantId, id }).del();
}

async function listScores(tenantId, { academic_year } = {}) {
  let q = db('staff_performance_scores as s')
    .leftJoin('users as u', 's.staff_user_id', 'u.id')
    .where('s.tenant_id', tenantId)
    .select('s.*', 'u.first_name', 'u.last_name')
    .orderBy('s.staff_name')
    .orderBy('s.academic_year')
    .orderBy('s.semester');
  if (academic_year) q = q.where('s.academic_year', academic_year);
  return q;
}

module.exports = { listCriteria, createCriteria, updateCriteria, removeCriteria, listScores };
