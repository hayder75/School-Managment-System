const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');
const hrService = require('../hr/hr.service');

async function createSalaryGrade(tenantId, data) {
  const [grade] = await db('salary_grades').insert({ ...data, tenant_id: tenantId }).returning('*');
  return grade;
}

async function findAllSalaryGrades(tenantId) {
  return db('salary_grades').where({ tenant_id: tenantId }).orderBy('name');
}

async function updateSalaryGrade(tenantId, id, data) {
  const [grade] = await db('salary_grades').where({ tenant_id: tenantId, id }).update(data).returning('*');
  return grade;
}

async function removeSalaryGrade(tenantId, id) {
  return db('salary_grades').where({ tenant_id: tenantId, id }).del();
}

const ALLOWANCE_FIELDS = ['transport_allowance', 'overtime', 'back_pay', 'unit_leader_allowance', 'department_head_allowance', 'housing_allowance', 'account_allowance', 'phone_allowance'];
const DEDUCTION_FIELDS = ['income_tax', 'eder', 'office_loan', 'cafe_loan', 'school_pay', 'pension_employee', 'ne_starving', 'attendance_deduction'];
const EMPLOYER_FIELDS = ['pension_employer'];

function num(v) {
  return parseFloat(v || 0) || 0;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

// === AUTO TAX & PENSION ===
async function getActiveTaxBrackets(tenantId) {
  return db('tax_brackets').where({ tenant_id: tenantId, is_active: true }).orderBy('min_salary');
}

// Ethiopian-style bracket formula: tax = taxable*rate - deduction for the bracket containing `taxable`.
function computeIncomeTax(taxable, brackets) {
  let tax = 0;
  for (const b of brackets) {
    const min = parseFloat(b.min_salary);
    const max = b.max_salary != null ? parseFloat(b.max_salary) : Infinity;
    if (taxable > min && taxable <= max) {
      const rate = parseFloat(b.rate) / 100;
      const deduction = parseFloat(b.deduction) || 0;
      tax = Math.max(0, taxable * rate - deduction);
      break;
    }
  }
  return round2(tax);
}

// Fill income_tax + pension from basic/OT whenever the client didn't supply them.
async function applyAutoCalculations(tenantId, data) {
  const out = { ...data };
  const basic = num(data.basic_pay);
  if (out.income_tax == null) {
    const brackets = await getActiveTaxBrackets(tenantId);
    if (brackets.length) out.income_tax = computeIncomeTax(basic + num(data.overtime), brackets);
  }
  if (out.pension_employee == null && basic > 0) out.pension_employee = round2(basic * 0.07);
  if (out.pension_employer == null && basic > 0) out.pension_employer = round2(basic * 0.11);
  return out;
}

function computeTotals(data) {
  const totals = {};
  if (ALLOWANCE_FIELDS.some((f) => data[f] != null)) {
    totals.allowances_total = ALLOWANCE_FIELDS.reduce((sum, f) => sum + num(data[f]), 0);
  }
  if (DEDUCTION_FIELDS.some((f) => data[f] != null)) {
    totals.deductions_total = DEDUCTION_FIELDS.reduce((sum, f) => sum + num(data[f]), 0);
  }
  if (data.basic_pay != null || totals.allowances_total != null || totals.deductions_total != null) {
    totals.net_pay = num(data.basic_pay ?? 0) + (totals.allowances_total ?? num(data.allowances_total)) - (totals.deductions_total ?? num(data.deductions_total));
  }
  return totals;
}

// Attendance-based deduction preview for a staff member's month.
async function computeAttendanceImpact(tenantId, { userId, month, year, basicPay } = {}) {
  const settings = await hrService.getStaffAttendanceSettings(tenantId);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  let basic = num(basicPay);
  if (!basic && userId) {
    const last = await db('payroll')
      .where({ tenant_id: tenantId, user_id: userId })
      .orderBy('year', 'desc')
      .orderBy('month', 'desc')
      .first();
    if (last) basic = num(last.basic_pay);
  }

  const from = m && y ? `${y}-${String(m).padStart(2, '0')}-01` : null;
  const to = m && y ? new Date(Date.UTC(y, m, 0)).toISOString().split('T')[0] : null;

  let unpaid = { unpaid_days: 0, absent_days: 0, half_days: 0, late_minutes: 0 };
  if (userId && from && to) {
    unpaid = await hrService.computeUnpaidDays(tenantId, userId, from, to);
  }

  const fixed = settings.fixed_daily_rate != null ? num(settings.fixed_daily_rate) : 0;
  const pct = settings.deduction_percent != null ? num(settings.deduction_percent) : 0;

  let dailyRate;
  if (fixed > 0 || pct > 0) {
    // Configurable: fixed birr per day + percentage of basic pay per day
    dailyRate = round2(fixed + (basic > 0 ? (pct / 100) * basic : 0));
  } else {
    // Fallback: prorate basic pay over working days
    dailyRate = settings.working_days > 0 ? round2(basic / settings.working_days) : 0;
  }

  let deduction = round2(dailyRate * unpaid.unpaid_days);
  if (basic > 0 && deduction > basic) deduction = round2(basic);

  return {
    enabled: !!settings.deduction_enabled,
    from,
    to,
    unpaid_days: unpaid.unpaid_days,
    absent_days: unpaid.absent_days,
    half_days: unpaid.half_days,
    late_minutes: unpaid.late_minutes || 0,
    daily_rate: dailyRate,
    working_days: settings.working_days,
    fixed_daily_rate: settings.fixed_daily_rate,
    deduction_percent: settings.deduction_percent,
    basic_pay: basic,
    deduction: settings.deduction_enabled ? deduction : 0,
  };
}

async function applyAttendanceDeduction(tenantId, data) {
  if (data.attendance_deduction != null) return data;
  const impact = await computeAttendanceImpact(tenantId, {
    userId: data.user_id,
    month: data.month,
    year: data.year,
    basicPay: data.basic_pay,
  });
  if (!impact.enabled || impact.unpaid_days <= 0) return data;
  return {
    ...data,
    attendance_deduction: impact.deduction,
    unpaid_days: data.unpaid_days != null ? data.unpaid_days : impact.unpaid_days,
    absent_days: data.absent_days != null ? data.absent_days : impact.absent_days,
  };
}

async function createPayroll(tenantId, data, performedBy) {
  const prefilled = await prefillOvertime(tenantId, data);
  const enriched = await applyAttendanceDeduction(
    tenantId,
    await applyAutoCalculations(tenantId, prefilled)
  );
  const totals = computeTotals(enriched);
  const [entry] = await db('payroll').insert({ ...enriched, ...totals, tenant_id: tenantId }).returning('*');
  await createPayrollAudit(tenantId, {
    payroll_id: entry.id,
    action: 'created',
    performed_by: performedBy,
    details: { month: entry.month, year: entry.year, basic_pay: entry.basic_pay, net_pay: entry.net_pay },
  });
  return entry;
}

// If no overtime was supplied, pull in the approved overtime amount computed on
// the HR overtime page for that staff member + month.
async function prefillOvertime(tenantId, data) {
  if (data.overtime != null || !data.user_id) return data;
  const amount = await hrService.getApprovedOvertimeAmount(tenantId, data.user_id, data.month, data.year);
  return amount > 0 ? { ...data, overtime: amount } : data;
}

// Preview computed values without saving (used by the UI "Calculate" button).
async function calculatePayroll(tenantId, data) {
  const prefilled = await prefillOvertime(tenantId, data);
  const enriched = await applyAttendanceDeduction(
    tenantId,
    await applyAutoCalculations(tenantId, prefilled)
  );
  const totals = computeTotals(enriched);
  return {
    ...enriched,
    ...totals,
    taxable_income: round2(num(prefilled.basic_pay) + num(prefilled.overtime)),
  };
}

async function findAllPayroll(tenantId, { page = 1, limit = 20, month, year, status, user_id } = {}) {
  let query = db('payroll')
    .where({ 'payroll.tenant_id': tenantId })
    .leftJoin('users', 'payroll.user_id', 'users.id')
    .leftJoin('salary_grades', 'payroll.salary_grade_id', 'salary_grades.id')
    .select('payroll.*', 'users.first_name', 'users.last_name', 'users.email', 'users.job_title', 'salary_grades.name as grade_name')
    .orderBy('payroll.year', 'desc')
    .orderBy('payroll.month', 'desc');
  if (month) query = query.where('payroll.month', month);
  if (year) query = query.where('payroll.year', year);
  if (status) query = query.where('payroll.status', status);
  if (user_id) query = query.where('payroll.user_id', user_id);
  return paginatedResult(query, page, limit);
}

async function updatePayroll(tenantId, id, data, performedBy) {
  const existing = await db('payroll').where({ tenant_id: tenantId, id }).first();
  if (!existing) return undefined;
  const merged = { ...existing, ...data };
  const payChanged = data.basic_pay != null || data.overtime != null;
  const derived = {};
  if (payChanged) {
    if (data.income_tax == null) {
      const brackets = await getActiveTaxBrackets(tenantId);
      if (brackets.length) derived.income_tax = computeIncomeTax(num(merged.basic_pay) + num(merged.overtime), brackets);
    }
    if (data.pension_employee == null) derived.pension_employee = round2(num(merged.basic_pay) * 0.07);
    if (data.pension_employer == null) derived.pension_employer = round2(num(merged.basic_pay) * 0.11);
  }
  if (data.apply_attendance === true && data.attendance_deduction == null) {
    const impact = await computeAttendanceImpact(tenantId, {
      userId: merged.user_id,
      month: merged.month,
      year: merged.year,
      basicPay: merged.basic_pay,
    });
    derived.attendance_deduction = impact.enabled ? impact.deduction : 0;
    derived.unpaid_days = impact.unpaid_days;
    if (merged.absent_days == null) derived.absent_days = impact.absent_days;
  }
  if (data.status !== undefined) {
    // Record when a person is paid; clear it if the entry is not paid.
    if (data.status === 'paid' && !data.paid_date) derived.paid_date = new Date().toISOString().slice(0, 10);
    else if (data.status !== 'paid') derived.paid_date = null;
  }
  const totals = computeTotals({ ...merged, ...derived });
  const [entry] = await db('payroll').where({ tenant_id: tenantId, id }).update({ ...data, ...derived, ...totals }).returning('*');
  await createPayrollAudit(tenantId, {
    payroll_id: entry.id,
    action: 'updated',
    performed_by: performedBy,
    details: { month: entry.month, year: entry.year, basic_pay: entry.basic_pay, net_pay: entry.net_pay, status: entry.status },
  });
  return entry;
}

async function getPayrollSummary(tenantId, month, year) {
  const now = new Date();
  const m = month !== undefined && month !== null && month !== '' ? month : now.getMonth() + 1;
  const y = year !== undefined && year !== null && year !== '' ? year : now.getFullYear();
  const where = { tenant_id: tenantId, month: m, year: y };
  const totalGross = await db('payroll').where(where).sum('basic_pay as total').first();
  const totalNet = await db('payroll').where(where).sum('net_pay as total').first();
  const count = await db('payroll').where(where).count('* as count').first();
  return {
    month: m,
    year: y,
    total_gross: parseFloat(totalGross?.total || 0),
    total_net: parseFloat(totalNet?.total || 0),
    employee_count: parseInt(count?.count || 0, 10),
  };
}

// Carry these fields forward from the previous payroll entry when generating a
// new month. Tax, pension and the attendance deduction are intentionally left
// out so the system recomputes them for the new month.
const CARRY_ALLOWANCES = ['transport_allowance', 'back_pay', 'unit_leader_allowance', 'department_head_allowance', 'housing_allowance', 'account_allowance', 'phone_allowance'];
const CARRY_DEDUCTIONS = ['eder', 'office_loan', 'cafe_loan', 'school_pay', 'ne_starving'];

/**
 * Generate payroll for every active staff member for a month, carrying forward
 * basic pay / allowances / deductions / bank details from their most recent
 * payroll entry (or the salary register if they have none). Tax, pension,
 * approved overtime and this month's attendance deduction are recalculated.
 * Staff who already have an entry for the month are skipped.
 */
async function generateMonthly(tenantId, { month, year }, performedBy) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!m || m < 1 || m > 12 || !y) {
    const e = new Error('MONTH_YEAR_REQUIRED'); e.code = 'MONTH_YEAR_REQUIRED'; throw e;
  }

  const staff = await db('users')
    .where({ tenant_id: tenantId, status: 'active' })
    .whereNotIn('role', ['student', 'parent'])
    .select('id', 'basic_salary', 'allowance', 'housing_allowance', 'account_allowance', 'phone_allowance');

  // Most recent payroll entry per staff, excluding the target month.
  const sources = await db('payroll')
    .where({ tenant_id: tenantId })
    .whereNot({ month: m, year: y })
    .distinctOn('user_id')
    .orderBy('user_id')
    .orderBy('year', 'desc')
    .orderBy('month', 'desc');
  const srcMap = new Map(sources.map((s) => [s.user_id, s]));

  const existing = await db('payroll').where({ tenant_id: tenantId, month: m, year: y }).select('user_id');
  const have = new Set(existing.map((e) => e.user_id));

  let created = 0, skipped = 0, noBase = 0;
  for (const u of staff) {
    if (have.has(u.id)) { skipped++; continue; }
    const src = srcMap.get(u.id);
    const data = { user_id: u.id, month: m, year: y };

    if (src) {
      data.basic_pay = src.basic_pay;
      data.salary_grade_id = src.salary_grade_id;
      data.work_days = src.work_days;
      data.bank_account = src.bank_account;
      data.bank_name = src.bank_name;
      for (const f of CARRY_ALLOWANCES) if (src[f] != null) data[f] = num(src[f]);
      for (const f of CARRY_DEDUCTIONS) if (src[f] != null) data[f] = num(src[f]);
    } else {
      const basic = num(u.basic_salary);
      if (basic <= 0) { noBase++; continue; }
      data.basic_pay = basic;
      if (num(u.allowance)) data.transport_allowance = num(u.allowance);
      if (num(u.housing_allowance)) data.housing_allowance = num(u.housing_allowance);
      if (num(u.account_allowance)) data.account_allowance = num(u.account_allowance);
      if (num(u.phone_allowance)) data.phone_allowance = num(u.phone_allowance);
    }

    // Leave tax, pension and attendance unset so they are recomputed, and let
    // approved overtime for the month be picked up automatically.
    data.income_tax = null;
    data.pension_employee = null;
    data.pension_employer = null;
    data.attendance_deduction = null;
    data.overtime = null;

    await createPayroll(tenantId, data, performedBy);
    created++;
  }

  return { created, skipped, missing_base: noBase, month: m, year: y };
}

// Mark every payroll entry for a month as paid (or back to pending / cancelled).
// Records the paid date when settling. Used by "Mark all paid".
async function settleMonth(tenantId, { month, year, status = 'paid' }, performedBy) {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!m || !y) { const e = new Error('MONTH_YEAR_REQUIRED'); e.code = 'MONTH_YEAR_REQUIRED'; throw e; }
  const target = ['paid', 'pending', 'cancelled'].includes(status) ? status : 'paid';
  const patch = { status: target };
  patch.paid_date = target === 'paid' ? new Date().toISOString().slice(0, 10) : null;
  const rows = await db('payroll')
    .where({ tenant_id: tenantId, month: m, year: y })
    .whereNot({ status: target })
    .update(patch)
    .returning('id');
  if (rows.length) {
    await createPayrollAudit(tenantId, {
      payroll_id: null, action: `bulk_${target}`, performed_by: performedBy,
      details: { month: m, year: y, count: rows.length, status: target },
    });
  }
  return { updated: rows.length, status: target, month: m, year: y };
}

// === TAX BRACKETS ===
async function listTaxBrackets(tenantId) {
  return db('tax_brackets').where({ tenant_id: tenantId, is_active: true }).orderBy('min_salary');
}
async function upsertTaxBracket(tenantId, id, data) {
  if (id) {
    const [b] = await db('tax_brackets').where({ tenant_id: tenantId, id }).update(data).returning('*');
    return b;
  }
  const [b] = await db('tax_brackets').insert({ ...data, tenant_id: tenantId }).returning('*');
  return b;
}
async function removeTaxBracket(tenantId, id) {
  return db('tax_brackets').where({ tenant_id: tenantId, id }).del();
}

// === LEAVES ===
async function listLeaves(tenantId, { staff_id, status } = {}) {
  let q = db('leaves').where({ 'leaves.tenant_id': tenantId })
    .leftJoin('users', 'leaves.staff_id', 'users.id')
    .select('leaves.*', db.raw("concat_ws(' ', users.first_name, users.middle_name, users.last_name) as staff_name"))
    .orderBy('created_at', 'desc');
  if (staff_id) q = q.where('leaves.staff_id', staff_id);
  if (status) q = q.where('leaves.status', status);
  return q;
}
async function createLeave(tenantId, userId, data) {
  const [leave] = await db('leaves').insert({ ...data, tenant_id: tenantId, staff_id: userId }).returning('*');
  return leave;
}
async function approveLeave(tenantId, id, userId) {
  const [leave] = await db('leaves').where({ tenant_id: tenantId, id }).update({ status: 'approved', approved_by: userId }).returning('*');
  return leave;
}
async function rejectLeave(tenantId, id, reason) {
  const [leave] = await db('leaves').where({ tenant_id: tenantId, id }).update({ status: 'rejected', reject_reason: reason }).returning('*');
  return leave;
}

// === PAYROLL AUDIT ===
async function listPayrollAudits(tenantId) {
  return db('payroll_audits').where({ 'payroll_audits.tenant_id': tenantId })
    .leftJoin('users', 'payroll_audits.performed_by', 'users.id')
    .select('payroll_audits.*', db.raw("concat_ws(' ', users.first_name, users.middle_name, users.last_name) as performed_by_name"))
    .orderBy('payroll_audits.created_at', 'desc');
}
async function createPayrollAudit(tenantId, data) {
  const [audit] = await db('payroll_audits').insert({ ...data, tenant_id: tenantId }).returning('*');
  return audit;
}

async function approvePayrollGM(tenantId, userId, { month, year, id } = {}) {
  let q = db('payroll').where({ tenant_id: tenantId });
  if (id) q = q.where({ id });
  if (month) q = q.where({ month });
  if (year) q = q.where({ year });

  const updated = await q.update({
    gm_approved: true,
    gm_approved_by: userId,
    gm_approved_at: db.fn.now(),
    updated_at: db.fn.now(),
  }).returning('*');

  return updated;
}

module.exports = {
  createSalaryGrade, findAllSalaryGrades, updateSalaryGrade, removeSalaryGrade,
  createPayroll, findAllPayroll, updatePayroll, getPayrollSummary, calculatePayroll,
  generateMonthly, settleMonth,
  computeAttendanceImpact,
  listTaxBrackets, upsertTaxBracket, removeTaxBracket,
  listLeaves, createLeave, approveLeave, rejectLeave,
  listPayrollAudits, createPayrollAudit,
  approvePayrollGM,
};
