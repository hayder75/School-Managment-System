const db = require('../../config/database');

const SYSTEM_CODES = ['quiz', 'test', 'classwork', 'homework', 'assignment', 'project', 'midterm', 'final', 'exam'];

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

async function list(tenantId, { includeInactive = false } = {}) {
  const query = db('assessment_types').where({ tenant_id: tenantId });
  if (!includeInactive) query.where({ is_active: true });
  const rows = await query.orderBy('sort_order', 'asc').orderBy('name', 'asc');

  const usage = await db('exams')
    .where({ tenant_id: tenantId })
    .groupBy('type')
    .select('type')
    .count('* as c');
  const used = Object.fromEntries(usage.map((r) => [String(r.type), Number(r.c)]));

  return rows.map((r) => ({ ...r, exams_count: used[r.code] || 0 }));
}

async function findById(tenantId, id) {
  return db('assessment_types').where({ tenant_id: tenantId, id }).first();
}

async function create(tenantId, data, actorId) {
  const code = slugify(data.code || data.name);
  if (!code) {
    const e = new Error('NAME_REQUIRED');
    e.code = 'NAME_REQUIRED';
    throw e;
  }
  const existing = await db('assessment_types').where({ tenant_id: tenantId, code }).first();
  if (existing) {
    const e = new Error('TYPE_EXISTS');
    e.code = 'TYPE_EXISTS';
    throw e;
  }
  const [row] = await db('assessment_types')
    .insert({
      tenant_id: tenantId,
      name: data.name,
      code,
      default_total_marks: data.default_total_marks ?? null,
      default_pass_marks: data.default_pass_marks ?? null,
      counts_toward_report: data.counts_toward_report !== false,
      sort_order: data.sort_order ?? 500,
      is_active: true,
      is_system: false,
    })
    .returning('*');
  return row;
}

async function update(tenantId, id, data) {
  const existing = await findById(tenantId, id);
  if (!existing) return null;

  const patch = { updated_at: db.fn.now() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.default_total_marks !== undefined) patch.default_total_marks = data.default_total_marks;
  if (data.default_pass_marks !== undefined) patch.default_pass_marks = data.default_pass_marks;
  if (data.counts_toward_report !== undefined) patch.counts_toward_report = !!data.counts_toward_report;
  if (data.sort_order !== undefined) patch.sort_order = data.sort_order;
  if (data.is_active !== undefined) patch.is_active = !!data.is_active;

  // Renaming a system type keeps its stable code so old exams stay linked.
  const [row] = await db('assessment_types').where({ tenant_id: tenantId, id }).update(patch).returning('*');
  return row;
}

async function remove(tenantId, id) {
  const existing = await findById(tenantId, id);
  if (!existing) return null;

  const used = await db('exams')
    .where({ tenant_id: tenantId, type: existing.code })
    .count('* as c')
    .first();
  const count = Number(used?.c || 0);

  // A type that has exams is deactivated (so history stays readable) rather
  // than deleted. Unused custom types are removed outright.
  if (count > 0 || SYSTEM_CODES.includes(existing.code)) {
    await db('assessment_types')
      .where({ tenant_id: tenantId, id })
      .update({ is_active: false, updated_at: db.fn.now() });
    return { removed: false, deactivated: true, exams_count: count };
  }

  await db('assessment_types').where({ tenant_id: tenantId, id }).del();
  return { removed: true, deactivated: false, exams_count: 0 };
}

async function activeCodes(tenantId) {
  const rows = await db('assessment_types')
    .where({ tenant_id: tenantId, is_active: true })
    .select('code');
  return rows.map((r) => r.code);
}

async function findByCode(tenantId, code) {
  return db('assessment_types').where({ tenant_id: tenantId, code }).first();
}

module.exports = { list, findById, findByCode, create, update, remove, activeCodes, slugify, SYSTEM_CODES };
