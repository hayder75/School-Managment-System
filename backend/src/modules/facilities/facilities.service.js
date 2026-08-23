const knex = require('../../config/database');

// ---------- Maintenance ----------
async function listMaintenance(tenantId, { status, category } = {}) {
  const query = knex('maintenance_requests as m')
    .leftJoin('users as u', 'm.reported_by', 'u.id')
    .where('m.tenant_id', tenantId)
    .select('m.*', knex.raw("CONCAT(u.first_name, ' ', u.last_name) as reported_by_name"))
    .orderBy('m.created_at', 'desc')
    .limit(300);
  if (status && status !== 'all') query.where('m.status', status);
  if (category && category !== 'all') query.where('m.category', category);
  return await query;
}

async function createMaintenance(tenantId, userId, data) {
  const [row] = await knex('maintenance_requests')
    .insert({
      tenant_id: tenantId,
      title: data.title,
      location: data.location,
      category: data.category || 'other',
      description: data.description,
      estimated_cost: data.estimated_cost || 0,
      reported_by: userId,
    })
    .returning('*');
  return row;
}

async function updateMaintenance(tenantId, id, data) {
  const payload = { updated_at: knex.fn.now() };
  ['assigned_to', 'estimated_cost', 'actual_cost', 'notes'].forEach((f) => {
    if (data[f] !== undefined) payload[f] = data[f];
  });
  if (data.status) {
    payload.status = data.status;
    if (data.status === 'completed') payload.completed_at = knex.fn.now();
  }
  const [row] = await knex('maintenance_requests')
    .where({ tenant_id: tenantId, id })
    .update(payload)
    .returning('*');
  return row || null;
}

async function maintenanceSummary(tenantId) {
  const [counts] = await knex('maintenance_requests')
    .where('tenant_id', tenantId)
    .select(
      knex.raw("COUNT(*) FILTER (WHERE status = 'open')::int as open"),
      knex.raw("COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress"),
      knex.raw("COUNT(*) FILTER (WHERE status = 'completed')::int as completed"),
      knex.raw('COALESCE(SUM(actual_cost), 0)::numeric as total_spent')
    );
  return counts;
}

// ---------- Purchase requests ----------
async function listPurchases(tenantId, { status } = {}) {
  const query = knex('purchase_requests as p')
    .leftJoin('users as u', 'p.requested_by', 'u.id')
    .leftJoin('users as a', 'p.approved_by', 'a.id')
    .where('p.tenant_id', tenantId)
    .select(
      'p.*',
      knex.raw("CONCAT(u.first_name, ' ', u.last_name) as requested_by_name"),
      knex.raw("CONCAT(a.first_name, ' ', a.last_name) as approved_by_name")
    )
    .orderBy('p.created_at', 'desc')
    .limit(300);
  if (status && status !== 'all') query.where('p.status', status);
  return await query;
}

async function createPurchase(tenantId, userId, data) {
  const [row] = await knex('purchase_requests')
    .insert({
      tenant_id: tenantId,
      item_name: data.item_name,
      quantity: Number(data.quantity) || 1,
      estimated_cost: data.estimated_cost || 0,
      justification: data.justification || null,
      requested_by: userId,
    })
    .returning('*');
  return row;
}

const GM_THRESHOLD = 10000;

async function decidePurchase(tenantId, approverId, id, { decision, note }) {
  if (!['approved', 'rejected'].includes(decision)) {
    throw Object.assign(new Error('INVALID_DECISION'), { code: 'INVALID_DECISION' });
  }
  const [row] = await knex('purchase_requests')
    .where({ tenant_id: tenantId, id })
    .update({
      status: decision === 'approved' ? 'approved' : 'rejected',
      approved_by: approverId,
      approved_at: knex.fn.now(),
      approval_note: note || null,
      updated_at: knex.fn.now(),
    })
    .returning('*');
  return row || null;
}

module.exports = {
  listMaintenance, createMaintenance, updateMaintenance, maintenanceSummary,
  listPurchases, createPurchase, decidePurchase,
  GM_THRESHOLD,
};
