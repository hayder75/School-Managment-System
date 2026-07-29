const db = require('../config/database');

async function calculateLateFees() {
  const overduePayments = await db('payments')
    .where('status', 'pending')
    .where('due_date', '<', db.fn.now())
    .where('balance', '>', 0);

  for (const payment of overduePayments) {
    const feeStructure = await db('fee_structures').where({ id: payment.fee_structure_id }).first();
    if (!feeStructure) continue;
    const lateFeePct = parseFloat(feeStructure.late_fee) || 0;
    if (lateFeePct <= 0) continue;
    const lateFeeAmount = (parseFloat(payment.balance) * lateFeePct) / 100;
    await db('payments').where({ id: payment.id }).update({
      balance: db.raw('balance + ?', [lateFeeAmount]),
      status: 'overdue',
    });
  }
  return { processed: overduePayments.length };
}

module.exports = { calculateLateFees };
