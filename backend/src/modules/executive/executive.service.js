const knex = require('../../config/database');

async function kpis(tenantId) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [collections] = await knex('payments as p')
    .where('p.tenant_id', tenantId)
    .where('p.paid_date', '>=', monthStart)
    .select(knex.raw('COALESCE(SUM(amount_paid), 0)::numeric as total'), knex.raw('COUNT(*)::int as count'));

  const [expensesMtd] = await knex('expenses')
    .where('tenant_id', tenantId)
    .where('expense_date', '>=', monthStart)
    .select(knex.raw('COALESCE(SUM(amount), 0)::numeric as total'));

  const [students] = await knex('students')
    .where({ tenant_id: tenantId, status: 'active' })
    .count('* as count');

  const [staff] = await knex('users')
    .where({ tenant_id: tenantId })
    .whereIn('status', ['active'])
    .whereNotIn('role', ['student', 'parent'])
    .count('* as count');

  const [pendingExpenseApprovals] = await knex('expenses')
    .where({ tenant_id: tenantId, approval_status: 'pending_gm' })
    .count('* as count');

  const [pendingPayrollRuns] = await knex('payroll')
    .where({ tenant_id: tenantId, gm_approval_status: 'pending' })
    .count('* as count');

  return {
    collections_mtd: collections?.total || 0,
    collections_count: collections?.count || 0,
    expenses_mtd: expensesMtd?.total || 0,
    net_mtd: parseFloat(collections?.total || 0) - parseFloat(expensesMtd?.total || 0),
    active_students: students?.count || 0,
    staff_headcount: staff?.count || 0,
    pending_expense_approvals: pendingExpenseApprovals?.count || 0,
    pending_payroll_runs: pendingPayrollRuns?.count || 0,
  };
}

async function trend(tenantId, months = 6) {
  const rows = await knex('payments')
    .where('tenant_id', tenantId)
    .select(
      knex.raw("TO_CHAR(DATE_TRUNC('month', paid_date), 'YYYY-MM') as month"),
      knex.raw('COALESCE(SUM(amount_paid), 0)::numeric as total')
    )
    .groupByRaw("DATE_TRUNC('month', paid_date)")
    .orderByRaw("DATE_TRUNC('month', paid_date) DESC")
    .limit(months);
  return rows.reverse();
}

// Expenses above threshold awaiting GM approval
async function pendingExpenses(tenantId, threshold = 10000) {
  return await knex('expenses as e')
    .leftJoin('users as u', 'e.created_by', 'u.id')
    .where('e.tenant_id', tenantId)
    .where('e.approval_status', 'pending_gm')
    .select(
      'e.*',
      knex.raw("CONCAT(u.first_name, ' ', u.last_name) as created_by_name")
    )
    .orderBy('e.expense_date', 'desc')
    .limit(200);
}

async function decideExpense(tenantId, gmUserId, id, { decision, note }) {
  if (!['approved', 'rejected'].includes(decision)) {
    throw Object.assign(new Error('INVALID_DECISION'), { code: 'INVALID_DECISION' });
  }
  const [row] = await knex('expenses')
    .where({ tenant_id: tenantId, id, approval_status: 'pending_gm' })
    .update({
      approval_status: decision === 'approved' ? 'approved' : 'rejected',
      approved_by_gm: gmUserId,
      gm_approved_at: knex.fn.now(),
      gm_note: note || null,
    })
    .returning('*');
  return row || null;
}

async function pendingPayrolls(tenantId) {
  return await knex('payroll as p')
    .where({ 'p.tenant_id': tenantId, 'p.gm_approval_status': 'pending' })
    .select('*')
    .orderBy('p.created_at', 'desc')
    .limit(50);
}

async function approvePayroll(tenantId, gmUserId, id, { decision }) {
  if (!['approved', 'rejected'].includes(decision)) {
    throw Object.assign(new Error('INVALID_DECISION'), { code: 'INVALID_DECISION' });
  }
  const [row] = await knex('payroll')
    .where({ tenant_id: tenantId, id, gm_approval_status: 'pending' })
    .update({
      gm_approval_status: decision === 'approved' ? 'approved' : 'rejected',
      gm_approved_by: gmUserId,
      gm_approved_at: knex.fn.now(),
    })
    .returning('*');
  return row || null;
}

module.exports = { kpis, trend, pendingExpenses, decideExpense, pendingPayrolls, approvePayroll };
