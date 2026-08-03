const feeService = require('./fees.service');
const access = require('../../shared/access');
const db = require('../../config/database');

async function getMyFees(req, res) {
  const userId = req.user.userId;
  let studentIds = [userId];

  if (req.user.role === 'parent') {
    studentIds = await access.getChildrenUserIdsForParent(req.tenant.id, userId);
  }

  if (studentIds.length === 0) {
    return res.json({ success: true, data: { payments: [], total_paid: 0, outstanding: 0 } });
  }

  const payments = await db('payments')
    .where({ 'payments.tenant_id': req.tenant.id })
    .whereIn('payments.student_id', studentIds)
    .leftJoin('users', 'payments.student_id', 'users.id')
    .leftJoin('fee_structures', 'payments.fee_structure_id', 'fee_structures.id')
    .select(
      'payments.*',
      'users.first_name', 'users.last_name',
      'fee_structures.name as fee_name', 'fee_structures.amount as fee_amount'
    )
    .orderBy('payments.created_at', 'desc');

  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
  const outstanding = payments
    .filter((p) => ['pending', 'partial', 'overdue'].includes(p.status))
    .reduce((s, p) => s + parseFloat(p.balance || 0), 0);

  res.json({ success: true, data: { payments, total_paid: totalPaid, outstanding } });
}

async function createFeeStructure(req, res) {
  const fee = await feeService.createFeeStructure(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: fee });
}

async function listFeeStructures(req, res) {
  const { page, limit, class_id, is_active } = req.query;
  const result = await feeService.findAllFeeStructures(req.tenant.id, { page, limit, class_id, is_active });
  res.json({ success: true, ...result });
}

async function getFeeStructureById(req, res) {
  const fee = await feeService.findFeeStructureById(req.tenant.id, req.params.id);
  if (!fee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Fee structure not found' } });
  res.json({ success: true, data: fee });
}

async function updateFeeStructure(req, res) {
  const fee = await feeService.updateFeeStructure(req.tenant.id, req.params.id, req.validated.body);
  if (!fee) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Fee structure not found' } });
  res.json({ success: true, data: fee });
}

async function removeFeeStructure(req, res) {
  await feeService.removeFeeStructure(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

async function createPayment(req, res) {
  try {
    const payment = await feeService.createPayment(req.tenant.id, req.validated.body, req.user.userId);
    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    if (err.code === 'STUDENT_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found in this school' } });
    }
    if (err.code === 'FEE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'FEE_NOT_FOUND', message: 'Fee structure not found in this school' } });
    }
    throw err;
  }
}

async function listPayments(req, res) {
  const { page, limit, student_id, status, collected_by, fee_structure_id, payment_method, month, year } = req.query;
  const isCashier = req.user.role === 'cashier';
  const scopedCollector = isCashier ? req.user.userId : collected_by;
  const result = await feeService.findAllPayments(req.tenant.id, {
    page, limit, student_id, status,
    collected_by: scopedCollector,
    fee_structure_id, payment_method, month, year,
  });
  res.json({ success: true, ...result });
}

async function getPaymentById(req, res) {
  const payment = await feeService.findPaymentById(req.tenant.id, req.params.id);
  if (!payment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } });
  res.json({ success: true, data: payment });
}

async function updatePayment(req, res) {
  try {
    const payment = await feeService.updatePayment(req.tenant.id, req.params.id, req.validated.body);
    if (!payment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } });
    res.json({ success: true, data: payment });
  } catch (err) {
    if (err.code === 'FEE_NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'FEE_NOT_FOUND', message: 'Fee structure not found in this school' } });
    }
    throw err;
  }
}

async function removePayment(req, res) {
  await feeService.removePayment(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

async function getSummary(req, res) {
  const isCashier = req.user.role === 'cashier';
  const summary = await feeService.getPaymentSummary(req.tenant.id, isCashier ? req.user.userId : null);
  res.json({ success: true, data: summary });
}

async function getCollectionReport(req, res) {
  const { month, year, fee_structure_id, class_id } = req.query;
  const report = await feeService.getCollectionReport(req.tenant.id, { month, year, fee_structure_id, class_id });
  res.json({ success: true, data: report });
}

async function getStudentLedger(req, res) {
  const ledger = await feeService.getStudentLedger(req.tenant.id, req.params.studentId);
  if (!ledger) return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found in this school' } });
  res.json({ success: true, data: ledger });
}

module.exports = {
  createFeeStructure, listFeeStructures, getFeeStructureById, updateFeeStructure, removeFeeStructure,
  createPayment, updatePayment, listPayments, getPaymentById, removePayment, getSummary,
  getStudentLedger, getCollectionReport,
  getMyFees,
};
