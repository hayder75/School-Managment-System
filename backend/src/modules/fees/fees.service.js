const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function createFeeStructure(tenantId, data) {
  const [fee] = await db('fee_structures').insert({ ...data, tenant_id: tenantId }).returning('*');
  return fee;
}

async function findAllFeeStructures(tenantId, { page = 1, limit = 20, class_id, is_active } = {}) {
  let query = db('fee_structures').where({ tenant_id: tenantId });
  if (class_id) query = query.where({ class_id });
  if (is_active !== undefined) query = query.where({ is_active });
  return paginatedResult(query.orderBy('created_at', 'desc'), page, limit);
}

async function findFeeStructureById(tenantId, id) {
  return db('fee_structures').where({ tenant_id: tenantId, id }).first();
}

async function updateFeeStructure(tenantId, id, data) {
  const [fee] = await db('fee_structures').where({ tenant_id: tenantId, id }).update(data).returning('*');
  return fee;
}

async function removeFeeStructure(tenantId, id) {
  return db('fee_structures').where({ tenant_id: tenantId, id }).del();
}

async function createPayment(tenantId, data) {
  const { student_id } = data;
  const student = await db('users').where({ id: student_id, tenant_id: tenantId }).select('id').first();
  if (!student) {
    const err = new Error('STUDENT_NOT_FOUND');
    err.code = 'STUDENT_NOT_FOUND';
    throw err;
  }
  if (data.fee_structure_id) {
    const fee = await db('fee_structures').where({ id: data.fee_structure_id, tenant_id: tenantId }).select('id').first();
    if (!fee) {
      const err = new Error('FEE_NOT_FOUND');
      err.code = 'FEE_NOT_FOUND';
      throw err;
    }
  }
  const [payment] = await db('payments').insert({ ...data, tenant_id: tenantId }).returning('*');
  return payment;
}

async function updatePayment(tenantId, id, data) {
  if (data.fee_structure_id) {
    const fee = await db('fee_structures').where({ id: data.fee_structure_id, tenant_id: tenantId }).select('id').first();
    if (!fee) {
      const err = new Error('FEE_NOT_FOUND');
      err.code = 'FEE_NOT_FOUND';
      throw err;
    }
  }
  const [payment] = await db('payments').where({ tenant_id: tenantId, id }).update(data).returning('*');
  return payment;
}

async function findAllPayments(tenantId, { page = 1, limit = 20, student_id, status } = {}) {
  let query = db('payments')
    .where({ 'payments.tenant_id': tenantId })
    .leftJoin('users', 'payments.student_id', 'users.id')
    .leftJoin('fee_structures', 'payments.fee_structure_id', 'fee_structures.id')
    .select('payments.*', 'users.first_name', 'users.last_name', 'fee_structures.name as fee_name')
    .orderBy('payments.created_at', 'desc');
  if (student_id) query = query.where('payments.student_id', student_id);
  if (status) query = query.where('payments.status', status);
  return paginatedResult(query, page, limit);
}

async function findPaymentById(tenantId, id) {
  return db('payments')
    .where({ 'payments.tenant_id': tenantId, 'payments.id': id })
    .leftJoin('users', 'payments.student_id', 'users.id')
    .select('payments.*', 'users.first_name', 'users.last_name')
    .first();
}

async function removePayment(tenantId, id) {
  return db('payments').where({ tenant_id: tenantId, id }).del();
}

async function getPaymentSummary(tenantId) {
  const totalCollected = await db('payments').where({ tenant_id: tenantId }).sum('amount_paid as total').first();
  const outstanding = await db('payments').where({ tenant_id: tenantId }).whereIn('status', ['pending', 'partial', 'overdue']).sum('balance as total').first();
  return {
    total_collected: parseFloat(totalCollected?.total || 0),
    outstanding: parseFloat(outstanding?.total || 0),
  };
}

module.exports = {
  createFeeStructure, findAllFeeStructures, findFeeStructureById, updateFeeStructure, removeFeeStructure,
  createPayment, updatePayment, findAllPayments, findPaymentById, removePayment, getPaymentSummary,
};
