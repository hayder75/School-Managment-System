const knex = require('../../config/database');

async function dailyCollections(tenantId, { date } = {}) {
  const targetDate = date || knex.raw('CURRENT_DATE');
  return await knex('payments as p')
    .join('users as u', 'p.collected_by', 'u.id')
    .where('p.tenant_id', tenantId)
    .whereRaw('DATE(p.paid_date) = ?', [targetDate])
    .select(
      'u.id as cashier_id',
      knex.raw("CONCAT(u.first_name, ' ', u.last_name) as cashier_name"),
      'p.payment_method as method',
      knex.raw('COUNT(*)::int as tx_count'),
      knex.raw('COALESCE(SUM(p.amount_paid), 0)::numeric as total'),
      knex.raw("COUNT(*) FILTER (WHERE p.reconciliation_locked = true)::int as locked_count")
    )
    .groupBy('u.id', 'u.first_name', 'u.last_name', 'p.payment_method')
    .orderBy('cashier_name', 'asc');
}

async function reconcileDay(tenantId, accountantId, { date, notes }) {
  return await knex.transaction(async (trx) => {
    const rows = await trx('payments as p')
      .where('p.tenant_id', tenantId)
      .whereRaw('DATE(p.paid_date) = ?', [date])
      .where('p.reconciliation_locked', false)
      .select(
        'p.payment_method as method',
        'p.collected_by',
        'p.amount_paid'
      );
    if (!rows.length) {
      throw Object.assign(new Error('NOTHING_TO_RECONCILE'), { code: 'NOTHING_TO_RECONCILE' });
    }

    const sumBy = (method) => rows
      .filter((r) => (r.method || '').toLowerCase() === method)
      .reduce((acc, r) => acc + parseFloat(r.amount_paid || 0), 0);

    // Map the stored lowercase methods onto the batch categories.
    const totalCash = sumBy('cash');
    const totalMobile = sumBy('mobile') + sumBy('telebirr');
    const totalCbe = sumBy('cbe') + sumBy('cbebirr');
    const totalOther = rows
      .filter((r) => !['cash', 'mobile', 'telebirr', 'cbe', 'cbebirr'].includes((r.method || '').toLowerCase()))
      .reduce((a, r) => a + parseFloat(r.amount_paid || 0), 0);

    // One consolidated daily batch, then lock all payments for that date
    const [batch] = await trx('payment_reconciliation_batches')
      .insert({
        tenant_id: tenantId,
        batch_date: date,
        reconciled_by: accountantId,
        cashier_id: null,
        total_cash: totalCash,
        total_telebirr: totalMobile,
        total_cbe: totalCbe,
        total_other: totalOther,
        total_amount: rows.reduce((a, r) => a + parseFloat(r.amount_paid || 0), 0),
        transaction_count: rows.length,
        notes: notes || null,
      })
      .returning('*');

    await trx('payments as p')
      .where('p.tenant_id', tenantId)
      .whereRaw('DATE(p.paid_date) = ?', [date])
      .where('p.reconciliation_locked', false)
      .update({
        reconciliation_locked: true,
        reconciliation_batch_id: batch.id,
      });

    return batch;
  });
}

async function listBatches(tenantId, { limit } = {}) {
  return await knex('payment_reconciliation_batches as b')
    .leftJoin('users as u', 'b.reconciled_by', 'u.id')
    .where('b.tenant_id', tenantId)
    .select('b.*', knex.raw("CONCAT(u.first_name, ' ', u.last_name) as reconciled_by_name"))
    .orderBy('b.batch_date', 'desc')
    .orderBy('b.created_at', 'desc')
    .limit(Math.min(Number(limit) || 60, 200));
}

async function defaulterAging(tenantId, { asOf } = {}) {
  const asOfDate = asOf ? String(asOf) : knex.raw('CURRENT_DATE');

  // Expected per student = active fee structures assigned to their class; paid = payments.
  const expected = await knex('fee_structures as f')
    .join('classes as c', 'f.class_id', 'c.id')
    .join('students as s', 's.class_id', 'c.id')
    .join('users as su', 's.user_id', 'su.id')
    .where('f.tenant_id', tenantId)
    .where('s.status', 'active')
    .groupBy('s.id', 'su.first_name', 'su.last_name', 'c.name')
    .select(
      's.id as student_id',
      'su.first_name',
      'su.last_name',
      'c.name as class_name',
      knex.raw('COALESCE(SUM(f.amount), 0)::numeric as expected_total')
    );

  const paidRows = await knex('payments as p')
    .where('p.tenant_id', tenantId)
    .groupBy('p.student_id')
    .select('p.student_id', knex.raw('COALESCE(SUM(p.amount_paid), 0)::numeric as paid_total'));
  const paidMap = new Map(paidRows.map((r) => [r.student_id, parseFloat(r.paid_total)]));

  const lastPaymentRows = await knex('payments as p')
    .where('p.tenant_id', tenantId)
    .groupBy('p.student_id')
    .select('p.student_id', knex.raw('MAX(p.paid_date) as last_payment_date'));
  const lastPayMap = new Map(lastPaymentRows.map((r) => [r.student_id, r.last_payment_date]));

  const buckets = { current: [], d30: [], d60: [], d90: [] };
  let totalOutstanding = 0;
  for (const row of expected) {
    const outstanding = parseFloat(row.expected_total) - (paidMap.get(row.student_id) || 0);
    if (outstanding <= 0.01) continue;
    totalOutstanding += outstanding;
    const lastPay = lastPayMap.get(row.student_id);
    let daysOverdue = 0;
    if (!lastPay) {
      daysOverdue = 999; // never paid
    } else {
      const asOfTs = asOf ? new Date(asOf).getTime() : Date.now();
      daysOverdue = Math.floor((asOfTs - new Date(lastPay).getTime()) / 86400000);
    }
    const entry = {
      student_id: row.student_id,
      student_name: `${row.first_name} ${row.last_name}`,
      class_name: row.class_name,
      expected: parseFloat(row.expected_total),
      paid: paidMap.get(row.student_id) || 0,
      outstanding,
      days_overdue: daysOverdue,
    };
    if (daysOverdue >= 90) buckets.d90.push(entry);
    else if (daysOverdue >= 60) buckets.d60.push(entry);
    else if (daysOverdue >= 30) buckets.d30.push(entry);
    else buckets.current.push(entry);
  }

  return {
    as_of: asOf || null,
    total_outstanding: totalOutstanding,
    summary: {
      current: buckets.current.length,
      d30: buckets.d30.length,
      d60: buckets.d60.length,
      d90: buckets.d90.length,
    },
    buckets,
  };
}

async function monthlyClose(tenantId, { year, month }) {
  const y = Number(year) || new Date().getFullYear();
  const m = Number(month) || new Date().getMonth() + 1;
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));

  const range = (qb, col) => qb.whereBetween(col, [start, end]).andWhere('tenant_id', tenantId);

  const [collections] = await range(knex('payments'), 'paid_date')
    .select(knex.raw('COALESCE(SUM(amount_paid), 0)::numeric as total'), knex.raw('COUNT(*)::int as count'));

  const collectionsByMethod = await range(knex('payments'), 'paid_date')
    .select('payment_method as method', knex.raw('COALESCE(SUM(amount_paid), 0)::numeric as total'))
    .groupBy('payment_method');

  const [expenses] = await range(knex('expenses'), 'expense_date')
    .select(knex.raw('COALESCE(SUM(amount), 0)::numeric as total'));

  const expensesByCategory = await range(knex('expenses'), 'expense_date')
    .select('category', knex.raw('COALESCE(SUM(amount), 0)::numeric as total'))
    .groupBy('category');

  const [payrollTotal] = await range(knex('payroll'), 'created_at')
    .select(knex.raw('COALESCE(SUM(net_pay), 0)::numeric as total'));

  return {
    period: { year: y, month: m },
    collections: { ...collections, by_method: collectionsByMethod },
    expenses: { ...expenses, by_category: expensesByCategory },
    payroll_payout: payrollTotal?.total || 0,
    net_position: parseFloat(collections.total || 0) - parseFloat(expenses.total || 0) - parseFloat(payrollTotal?.total || 0),
  };
}

module.exports = { dailyCollections, reconcileDay, listBatches, defaulterAging, monthlyClose };
