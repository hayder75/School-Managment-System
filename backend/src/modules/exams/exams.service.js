const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function create(tenantId, data) {
  const [exam] = await db('exams').insert({ ...data, tenant_id: tenantId }).returning('*');
  return exam;
}

async function findAll(tenantId, { page = 1, limit = 20, class_id, subject_id } = {}) {
  let query = db('exams')
    .where({ 'exams.tenant_id': tenantId })
    .leftJoin('classes', 'exams.class_id', 'classes.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select('exams.*', 'classes.name as class_name', 'subjects.name as subject_name')
    .orderBy('exams.date', 'desc');

  if (class_id) query = query.where('exams.class_id', class_id);
  if (subject_id) query = query.where('exams.subject_id', subject_id);

  return paginatedResult(query, page, limit);
}

async function findById(tenantId, id) {
  return db('exams')
    .where({ 'exams.tenant_id': tenantId, 'exams.id': id })
    .leftJoin('classes', 'exams.class_id', 'classes.id')
    .leftJoin('subjects', 'exams.subject_id', 'subjects.id')
    .select('exams.*', 'classes.name as class_name', 'subjects.name as subject_name')
    .first();
}

async function update(tenantId, id, data) {
  data.updated_at = db.fn.now();
  const [exam] = await db('exams').where({ tenant_id: tenantId, id }).update(data).returning('*');
  return exam;
}

async function remove(tenantId, id) {
  return db('exams').where({ tenant_id: tenantId, id }).del();
}

module.exports = { create, findAll, findById, update, remove };
