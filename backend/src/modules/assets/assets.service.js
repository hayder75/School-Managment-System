const knex = require('../../config/database');

async function listAssets(tenantId, { search, category, status } = {}) {
  let query = knex('school_assets as a')
    .leftJoin('users as u', 'a.assigned_to', 'u.id')
    .where('a.tenant_id', tenantId)
    .select(
      'a.*',
      knex.raw("CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name")
    )
    .orderBy('a.created_at', 'desc');

  if (search) {
    query = query.where((builder) => {
      builder
        .whereILike('a.name', `%${search}%`)
        .orWhereILike('a.asset_code', `%${search}%`)
        .orWhereILike('a.location', `%${search}%`);
    });
  }

  if (category && category !== 'all') {
    query = query.where('a.category', category);
  }

  if (status && status !== 'all') {
    query = query.where('a.status', status);
  }

  const assets = await query;
  return assets;
}

async function getAssetSummary(tenantId) {
  const [totals] = await knex('school_assets')
    .where('tenant_id', tenantId)
    .select(
      knex.raw('COALESCE(COUNT(*), 0)::integer as total_items'),
      knex.raw('COALESCE(SUM(quantity), 0)::integer as total_quantity'),
      knex.raw('COALESCE(SUM(total_cost), 0)::numeric as total_value'),
      knex.raw("COALESCE(COUNT(*) FILTER (WHERE status = 'Maintenance'), 0)::integer as in_maintenance"),
      knex.raw("COALESCE(COUNT(*) FILTER (WHERE status = 'Broken'), 0)::integer as broken_items"),
      knex.raw("COALESCE(COUNT(*) FILTER (WHERE status = 'Available'), 0)::integer as available_items"),
      knex.raw("COALESCE(COUNT(*) FILTER (WHERE status = 'Disposed'), 0)::integer as disposed_items"),
      knex.raw("COALESCE(SUM(total_cost) FILTER (WHERE status = 'Disposed'), 0)::numeric as disposed_value")
    );

  const categoryBreakdown = await knex('school_assets')
    .where('tenant_id', tenantId)
    .select('category')
    .count('* as count')
    .sum('total_cost as total_value')
    .groupBy('category');

  return {
    totals,
    categoryBreakdown,
  };
}

async function createAsset(tenantId, data) {
  const unitCost = parseFloat(data.unitCost || 0);
  const quantity = parseInt(data.quantity || 1, 10);
  const totalCost = unitCost * quantity;

  const [asset] = await knex('school_assets')
    .insert({
      tenant_id: tenantId,
      name: data.name,
      asset_code: data.assetCode || `AST-${Date.now().toString().slice(-4)}`,
      category: data.category || 'Other',
      quantity,
      unit_cost: unitCost,
      total_cost: totalCost,
      location: data.location || null,
      status: data.status || 'Available',
      condition: data.condition || 'Good',
      assigned_to: data.assignedTo || null,
      purchase_date: data.purchaseDate || null,
      notes: data.notes || null,
      condition: data.condition || 'Good',
      useful_life_years: data.usefulLifeYears ? parseInt(data.usefulLifeYears, 10) : null,
    })
    .returning('*');

  if (asset.assigned_to) {
    await knex('asset_assignments').insert({
      tenant_id: tenantId,
      asset_id: asset.id,
      assigned_to: asset.assigned_to,
      recorded_by: null,
    });
  }

  return asset;
}

async function getStaffOptions(tenantId) {
  return await knex('users')
    .where({ tenant_id: tenantId, status: 'active' })
    .whereIn('role', ['admin', 'owner', 'teacher', 'hr', 'general_services', 'security_head', 'accountant', 'cashier', 'support'])
    .select('id', 'first_name', 'last_name', 'role')
    .orderBy('first_name');
}

async function listAssignments(tenantId, assetId) {
  return await knex('asset_assignments as aa')
    .leftJoin('users as u', 'aa.assigned_to', 'u.id')
    .where({ 'aa.tenant_id': tenantId, 'aa.asset_id': assetId })
    .select(
      'aa.*',
      knex.raw("CONCAT(u.first_name, ' ', u.last_name) as holder_name"),
      'u.role as holder_role'
    )
    .orderBy('aa.assigned_at', 'desc');
}

async function getInventoryReport(tenantId, year) {
  const y = Number(year) || new Date().getFullYear();
  const start = `${y}-01-01`;
  const end = `${y + 1}-01-01`;

  const byCategory = await knex('school_assets')
    .where('tenant_id', tenantId)
    .select('category')
    .count('* as items')
    .sum('quantity as units')
    .sum('total_cost as value')
    .groupBy('category')
    .orderBy('value', 'desc');

  const byStatus = await knex('school_assets')
    .where('tenant_id', tenantId)
    .select('status').count('* as count').groupBy('status');

  const byCondition = await knex('school_assets')
    .where('tenant_id', tenantId)
    .select('condition').count('* as count').groupBy('condition');

  const acquired = await knex('school_assets')
    .where('tenant_id', tenantId)
    .whereBetween('purchase_date', [start, end])
    .select('id', 'name', 'asset_code', 'category', 'quantity', 'unit_cost', 'total_cost', 'purchase_date')
    .orderBy('purchase_date');

  const disposedRows = await knex('school_assets')
    .where('tenant_id', tenantId)
    .where('status', 'Disposed')
    .whereBetween('disposal_date', [start, end])
    .select('id', 'name', 'asset_code', 'category', 'quantity', 'total_cost as value',
      'disposal_date', 'disposal_reason', 'disposal_method')
    .orderBy('disposal_date');

  const countDiscrepancies = await knex('school_assets')
    .where('tenant_id', tenantId)
    .whereNotNull('counted_quantity')
    .whereColumn('counted_quantity', '<>', 'quantity')
    .select('id', 'name', 'asset_code', 'quantity', 'counted_quantity', 'counted_date', 'count_notes')
    .orderBy('name')
    .limit(100);

  const [totals] = await knex('school_assets')
    .where('tenant_id', tenantId)
    .select(
      knex.raw('COUNT(*)::int as items'),
      knex.raw('COALESCE(SUM(quantity),0)::int as units'),
      knex.raw('COALESCE(SUM(total_cost),0)::numeric as total_value'),
      knex.raw(`COALESCE(SUM(total_cost) FILTER (WHERE purchase_date >= '${start}' AND purchase_date < '${end}'),0)::numeric as acquired_value`),
      knex.raw(`COUNT(*) FILTER (WHERE purchase_date >= '${start}' AND purchase_date < '${end}')::int as acquired_count`),
      knex.raw(`COALESCE(SUM(total_cost) FILTER (WHERE status = 'Disposed' AND disposal_date >= '${start}' AND disposal_date < '${end}'),0)::numeric as disposed_value`)
    );

  const byCategoryWithDepreciation = byCategory.map((c) => {
    void c;
    return c;
  });

  return {
    year: y,
    generated_at: new Date().toISOString(),
    totals,
    byCategory,
    byStatus,
    byCondition,
    acquired,
    disposed: disposedRows,
    countDiscrepancies,
  };
}

async function updateAsset(tenantId, userId, assetId, data) {
  const existing = await knex('school_assets').where({ id: assetId, tenant_id: tenantId }).first();
  if (!existing) return null;

  const unitCost = parseFloat(data.unitCost || 0);
  const quantity = parseInt(data.quantity || 1, 10);
  const totalCost = unitCost * quantity;

  const [updated] = await knex('school_assets')
    .where({ id: assetId, tenant_id: tenantId })
    .update({
      name: data.name,
      asset_code: data.assetCode,
      category: data.category,
      quantity,
      unit_cost: unitCost,
      total_cost: totalCost,
      location: data.location,
      status: data.status,
      condition: data.condition || existing.condition || 'Good',
      assigned_to: data.assignedTo || null,
      purchase_date: data.purchaseDate || null,
      disposal_date: data.status === 'Disposed' ? (data.disposalDate || new Date().toISOString().slice(0, 10)) : null,
      disposal_reason: data.status === 'Disposed' ? (data.disposalReason || null) : null,
      disposal_method: data.status === 'Disposed' ? (data.disposalMethod || null) : null,
      useful_life_years: data.usefulLifeYears !== undefined
        ? (data.usefulLifeYears ? parseInt(data.usefulLifeYears, 10) : null)
        : (existing.useful_life_years ?? null),
      counted_quantity: data.countedQuantity !== undefined ? data.countedQuantity : existing.counted_quantity,
      counted_date: data.countedDate !== undefined ? data.countedDate : existing.counted_date,
      count_notes: data.countNotes !== undefined ? data.countNotes : existing.count_notes,
      updated_at: knex.fn.now(),
    })
    .returning('*');

  // Assignment transfer log
  const oldHolder = existing.assigned_to || null;
  const newHolder = data.assignedTo || null;
  if (oldHolder !== newHolder) {
    if (oldHolder) {
      await knex('asset_assignments')
        .where({ tenant_id: tenantId, asset_id: assetId })
        .whereNull('unassigned_at')
        .update({ unassigned_at: knex.fn.now() });
    }
    if (newHolder) {
      await knex('asset_assignments').insert({
        tenant_id: tenantId,
        asset_id: assetId,
        assigned_to: newHolder,
        recorded_by: userId || null,
        notes: data.assignmentNotes || null,
      });
    }
  }

  return updated;
}

async function disposeAsset(tenantId, approverId, assetId, data) {
  if (!data.reason) {
    throw Object.assign(new Error('REASON_REQUIRED'), { code: 'REASON_REQUIRED' });
  }
  const [updated] = await knex('school_assets')
    .where({ id: assetId, tenant_id: tenantId })
    .whereNot('status', 'Disposed')
    .update({
      status: 'Disposed',
      condition: data.condition || 'Poor',
      disposal_date: data.date || new Date().toISOString().slice(0, 10),
      disposal_reason: data.reason,
      disposal_method: data.method || 'Scrapped',
      disposed_approved_by: approverId || null,
      updated_at: knex.fn.now(),
    })
    .returning('*');
  return updated || null;
}

async function deleteAsset(tenantId, assetId) {
  await knex('school_assets')
    .where({ id: assetId, tenant_id: tenantId })
    .del();
  return { success: true };
}

module.exports = {
  listAssets,
  getAssetSummary,
  createAsset,
  updateAsset,
  deleteAsset,
  getStaffOptions,
  listAssignments,
  disposeAsset,
  getInventoryReport,
};
