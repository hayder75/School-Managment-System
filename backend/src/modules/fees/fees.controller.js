const feeService = require('./fees.service');

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
  const payment = await feeService.createPayment(req.tenant.id, req.validated.body);
  res.status(201).json({ success: true, data: payment });
}

async function listPayments(req, res) {
  const { page, limit, student_id, status } = req.query;
  const result = await feeService.findAllPayments(req.tenant.id, { page, limit, student_id, status });
  res.json({ success: true, ...result });
}

async function getPaymentById(req, res) {
  const payment = await feeService.findPaymentById(req.tenant.id, req.params.id);
  if (!payment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } });
  res.json({ success: true, data: payment });
}

async function removePayment(req, res) {
  await feeService.removePayment(req.tenant.id, req.params.id);
  res.json({ success: true, data: null });
}

async function getSummary(req, res) {
  const summary = await feeService.getPaymentSummary(req.tenant.id);
  res.json({ success: true, data: summary });
}

module.exports = {
  createFeeStructure, listFeeStructures, getFeeStructureById, updateFeeStructure, removeFeeStructure,
  createPayment, listPayments, getPaymentById, removePayment, getSummary,
};
