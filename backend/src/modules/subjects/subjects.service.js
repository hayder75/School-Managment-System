const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function attachLevels(tenantId, subjects) {
  if (!subjects || subjects.length === 0) return subjects;
  const ids = subjects.map((s) => s.id);
  const rows = await db('subject_levels').where({ tenant_id: tenantId }).whereIn('subject_id', ids);
  const map = {};
  for (const r of rows) {
    (map[r.subject_id] = map[r.subject_id] || []).push({ level_group: r.level_group, grade_level: r.grade_level });
  }
  return subjects.map((s) => ({ ...s, levels: map[s.id] || [] }));
}

async function replaceLevels(trx, tenantId, subjectId, levels) {
  await trx('subject_levels').where({ tenant_id: tenantId, subject_id: subjectId }).del();
  if (levels && levels.length) {
    const seen = new Set();
    const rows = [];
    for (const l of levels) {
      const key = `${l.level_group || ''}:${l.grade_level ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ tenant_id: tenantId, subject_id: subjectId, level_group: l.level_group || null, grade_level: l.grade_level ?? null });
    }
    await trx('subject_levels').insert(rows);
  }
}

async function create(tenantId, data) {
  const { levels, ...subjectData } = data;
  return db.transaction(async (trx) => {
    const [subject] = await trx('subjects').insert({ ...subjectData, tenant_id: tenantId }).returning('*');
    await replaceLevels(trx, tenantId, subject.id, levels);
    const rows = await trx('subject_levels').where({ tenant_id: tenantId, subject_id: subject.id });
    return { ...subject, levels: rows.map((r) => ({ level_group: r.level_group, grade_level: r.grade_level })) };
  });
}

async function findAll(tenantId, { page = 1, limit = 20, is_active } = {}) {
  let query = db('subjects')
    .where({ tenant_id: tenantId })
    .orderBy('name', 'asc');

  if (is_active !== undefined) query = query.where({ is_active });

  const result = await paginatedResult(query, page, limit);
  result.data = await attachLevels(tenantId, result.data);
  return result;
}

async function findById(tenantId, id) {
  const subject = await db('subjects').where({ tenant_id: tenantId, id }).first();
  if (!subject) return null;
  const [withLevels] = await attachLevels(tenantId, [subject]);
  return withLevels;
}

async function update(tenantId, id, data) {
  const { levels, ...subjectData } = data;
  return db.transaction(async (trx) => {
    let subject;
    if (Object.keys(subjectData).length > 0) {
      subjectData.updated_at = trx.fn.now();
      [subject] = await trx('subjects').where({ tenant_id: tenantId, id }).update(subjectData).returning('*');
    } else {
      subject = await trx('subjects').where({ tenant_id: tenantId, id }).first();
    }
    if (!subject) return null;
    if (levels !== undefined) await replaceLevels(trx, tenantId, id, levels);
    const rows = await trx('subject_levels').where({ tenant_id: tenantId, subject_id: id });
    return { ...subject, levels: rows.map((r) => ({ level_group: r.level_group, grade_level: r.grade_level })) };
  });
}

async function remove(tenantId, id) {
  return db('subjects').where({ tenant_id: tenantId, id }).del();
}

module.exports = { create, findAll, findById, update, remove };
