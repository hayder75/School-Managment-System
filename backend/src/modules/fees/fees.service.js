const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');
const broadcast = require('../../socket/broadcast');
const logger = require('../../config/logger');

// Per-tenant sequential receipt number, derived from the highest existing one.
async function nextReceiptNo(trx, tenantId) {
  const row = await trx('payments')
    .where({ tenant_id: tenantId })
    .whereNotNull('receipt_no')
    .orderBy('receipt_no', 'desc')
    .select('receipt_no')
    .first();
  let seq = 0;
  if (row && row.receipt_no) {
    const m = row.receipt_no.match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10);
  }
  return `RCT-${String(seq + 1).padStart(6, '0')}`;
}

// Guard against accidental double submissions: reject an identical payment
// (same student, fee, and amount) recorded within a short window.
const DUPLICATE_WINDOW_SECONDS = 90;
async function assertNotDuplicate(trx, tenantId, p) {
  const q = trx('payments')
    .where({ tenant_id: tenantId, student_id: p.student_id, amount_paid: p.amount_paid })
    .where('created_at', '>', trx.raw(`now() - interval '${DUPLICATE_WINDOW_SECONDS} seconds'`));
  if (p.fee_structure_id) q.where('fee_structure_id', p.fee_structure_id);
  else q.whereNull('fee_structure_id');
  const dup = await q.first();
  if (dup) {
    const err = new Error('DUPLICATE_PAYMENT');
    err.code = 'DUPLICATE_PAYMENT';
    err.existing = dup;
    throw err;
  }
}

async function attachAmounts(tenantId, fees) {
  if (!fees || fees.length === 0) return fees;
  const ids = fees.map((f) => f.id);
  const rows = await db('fee_structure_amounts')
    .where({ tenant_id: tenantId })
    .whereIn('fee_structure_id', ids)
    .orderBy('grade_level');
  const map = {};
  for (const r of rows) {
    (map[r.fee_structure_id] = map[r.fee_structure_id] || []).push({ grade_level: r.grade_level, amount: parseFloat(r.amount) });
  }
  return fees.map((f) => ({ ...f, amounts: map[f.id] || [] }));
}

async function replaceAmounts(trx, tenantId, feeId, amounts) {
  await trx('fee_structure_amounts').where({ tenant_id: tenantId, fee_structure_id: feeId }).del();
  if (amounts && amounts.length) {
    // De-duplicate by grade (last wins) to satisfy the unique constraint.
    const byGrade = new Map();
    for (const a of amounts) byGrade.set(a.grade_level, a.amount);
    await trx('fee_structure_amounts').insert(
      [...byGrade.entries()].map(([grade_level, amount]) => ({
        tenant_id: tenantId,
        fee_structure_id: feeId,
        grade_level,
        amount,
      }))
    );
  }
}

async function createFeeStructure(tenantId, data) {
  const { amounts, ...feeData } = data;
  return db.transaction(async (trx) => {
    const [fee] = await trx('fee_structures').insert({ ...feeData, tenant_id: tenantId }).returning('*');
    await replaceAmounts(trx, tenantId, fee.id, amounts);
    const rows = await trx('fee_structure_amounts').where({ tenant_id: tenantId, fee_structure_id: fee.id }).orderBy('grade_level');
    return { ...fee, amounts: rows.map((r) => ({ grade_level: r.grade_level, amount: parseFloat(r.amount) })) };
  });
}

async function findAllFeeStructures(tenantId, { page = 1, limit = 20, class_id, is_active } = {}) {
  let query = db('fee_structures').where({ tenant_id: tenantId });
  if (class_id) query = query.where({ class_id });
  if (is_active !== undefined) query = query.where({ is_active });
  const result = await paginatedResult(query.orderBy('created_at', 'desc'), page, limit);
  result.data = await attachAmounts(tenantId, result.data);
  return result;
}

async function findFeeStructureById(tenantId, id) {
  const fee = await db('fee_structures').where({ tenant_id: tenantId, id }).first();
  if (!fee) return null;
  const [withAmounts] = await attachAmounts(tenantId, [fee]);
  return withAmounts;
}

async function updateFeeStructure(tenantId, id, data) {
  const { amounts, ...feeData } = data;
  return db.transaction(async (trx) => {
    let fee;
    if (Object.keys(feeData).length > 0) {
      [fee] = await trx('fee_structures').where({ tenant_id: tenantId, id }).update(feeData).returning('*');
    } else {
      fee = await trx('fee_structures').where({ tenant_id: tenantId, id }).first();
    }
    if (!fee) return null;
    if (amounts !== undefined) {
      await replaceAmounts(trx, tenantId, id, amounts);
    }
    const rows = await trx('fee_structure_amounts').where({ tenant_id: tenantId, fee_structure_id: id }).orderBy('grade_level');
    return { ...fee, amounts: rows.map((r) => ({ grade_level: r.grade_level, amount: parseFloat(r.amount) })) };
  });
}

async function removeFeeStructure(tenantId, id) {
  return db('fee_structures').where({ tenant_id: tenantId, id }).del();
}

async function createPayment(tenantId, data, collectedBy) {
  const { student_id } = data;
  const student = await db('users')
    .join('students', 'students.user_id', 'users.id')
    .where({ 'users.id': student_id, 'users.tenant_id': tenantId, 'users.role': 'student' })
    .select('users.id')
    .first();
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
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const payment = await db.transaction(async (trx) => {
        await assertNotDuplicate(trx, tenantId, data);
        const receipt_no = await nextReceiptNo(trx, tenantId);
        const [row] = await trx('payments')
          .insert({ ...data, tenant_id: tenantId, collected_by: collectedBy || null, receipt_no })
          .returning('*');
        return row;
      });
      await notifyPaymentRecorded(tenantId, payment);
      return payment;
    } catch (err) {
      lastErr = err;
      const isReceiptCollision = err.code === '23505' && String(err.constraint || '').includes('receipt_no');
      if (isReceiptCollision && attempt < 2) continue;
      throw err;
    }
  }
  throw lastErr;
}

async function createBulkPayments(tenantId, payments, collectedBy) {
  const studentIds = [...new Set(payments.map((p) => p.student_id))];
  const feeIds = [...new Set(payments.map((p) => p.fee_structure_id).filter(Boolean))];

  const students = await db('users')
    .join('students', 'students.user_id', 'users.id')
    .where({ 'users.role': 'student', 'users.tenant_id': tenantId })
    .whereIn('users.id', studentIds)
    .select('users.id');
  const foundStudents = new Set(students.map((s) => s.id));
  const missingStudents = studentIds.filter((id) => !foundStudents.has(id));
  if (missingStudents.length > 0) {
    const err = new Error('STUDENT_NOT_FOUND');
    err.code = 'STUDENT_NOT_FOUND';
    throw err;
  }

  if (feeIds.length > 0) {
    const fees = await db('fee_structures').where({ tenant_id: tenantId }).whereIn('id', feeIds).select('id');
    const foundFees = new Set(fees.map((f) => f.id));
    const missingFees = feeIds.filter((id) => !foundFees.has(id));
    if (missingFees.length > 0) {
      const err = new Error('FEE_NOT_FOUND');
      err.code = 'FEE_NOT_FOUND';
      throw err;
    }
  }

  const created = await db.transaction(async (trx) => {
    const rows = [];
    for (const p of payments) {
      await assertNotDuplicate(trx, tenantId, p);
      const receipt_no = await nextReceiptNo(trx, tenantId);
      const [row] = await trx('payments')
        .insert({ ...p, tenant_id: tenantId, collected_by: collectedBy || null, receipt_no })
        .returning('*');
      rows.push(row);
    }
    return rows;
  });

  for (const payment of created) {
    await notifyPaymentRecorded(tenantId, payment);
  }

  const total = created.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
  return { created, count: created.length, total };
}

async function notifyPaymentRecorded(tenantId, payment) {
  try {
    const recipients = [payment.student_id];
    const parentRows = await db('student_parents')
      .join('students', 'student_parents.student_id', 'students.id')
      .where({ 'student_parents.tenant_id': tenantId })
      .where('students.user_id', payment.student_id)
      .select('student_parents.parent_id');
    recipients.push(...parentRows.map((p) => p.parent_id));

    await broadcast.notifyUsers(tenantId, recipients, {
      title: 'Payment Recorded',
      message: `A payment of ${payment.amount_paid} has been recorded against your account.`,
      type: 'payment',
      refType: 'payment',
      refId: payment.id,
    });
  } catch (err) {
    logger.error('Payment notification error', { error: err.message });
  }
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

async function findAllPayments(tenantId, { page = 1, limit = 20, student_id, status, collected_by, fee_structure_id, payment_method, month, year } = {}) {
  let query = db('payments')
    .where({ 'payments.tenant_id': tenantId })
    .leftJoin('users', 'payments.student_id', 'users.id')
    .leftJoin('fee_structures', 'payments.fee_structure_id', 'fee_structures.id')
    .leftJoin('users as collectors', 'payments.collected_by', 'collectors.id')
    .select(
      'payments.*', 'users.first_name', 'users.last_name',
      'fee_structures.name as fee_name',
      'collectors.first_name as collector_first_name', 'collectors.last_name as collector_last_name'
    )
    .orderBy('payments.created_at', 'desc');
  if (student_id) query = query.where('payments.student_id', student_id);
  if (status) query = query.where('payments.status', status);
  if (collected_by) query = query.where('payments.collected_by', collected_by);
  if (fee_structure_id) query = query.where('payments.fee_structure_id', fee_structure_id);
  if (payment_method) query = query.where('payments.payment_method', payment_method);
  if (month) query = query.whereRaw('EXTRACT(MONTH FROM payments.paid_date) = ?', [parseInt(month, 10)]);
  if (year) query = query.whereRaw('EXTRACT(YEAR FROM payments.paid_date) = ?', [parseInt(year, 10)]);
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

async function getPaymentSummary(tenantId, collectorUserId = null) {
  let totalCollected = db('payments').where({ tenant_id: tenantId });
  let outstanding = db('payments').where({ tenant_id: tenantId });
  let byCollector = db('payments')
    .where({ 'payments.tenant_id': tenantId, 'payments.status': 'paid' })
    .leftJoin('users as collectors', 'payments.collected_by', 'collectors.id');

  if (collectorUserId) {
    totalCollected = totalCollected.where('payments.collected_by', collectorUserId);
    outstanding = outstanding.where('payments.collected_by', collectorUserId);
    byCollector = byCollector.where('payments.collected_by', collectorUserId);
  }

  const [totalCollectedRes] = await totalCollected.clone().sum('amount_paid as total');
  const [outstandingRes] = await outstanding.clone().whereIn('status', ['pending', 'partial', 'overdue']).sum('balance as total');

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [todayRes] = await totalCollected.clone()
    .whereRaw('DATE(payments.paid_date) = ?', [today])
    .sum('amount_paid as total').count('* as count');
  const [monthRes] = await totalCollected.clone()
    .whereRaw('DATE(payments.paid_date) >= ?', [monthStart])
    .sum('amount_paid as total').count('* as count');

  byCollector = await byCollector
    .groupBy('payments.collected_by', 'collectors.first_name', 'collectors.last_name')
    .select(
      'payments.collected_by',
      'collectors.first_name as collector_first_name',
      'collectors.last_name as collector_last_name',
      db.raw('SUM(payments.amount_paid) as total'),
      db.raw('COUNT(*) as transaction_count'),
      db.raw('MIN(payments.paid_date) as first_paid_date'),
      db.raw('MAX(payments.paid_date) as last_paid_date')
    )
    .orderByRaw('SUM(payments.amount_paid) DESC');

  return {
    total_collected: parseFloat(totalCollectedRes?.total || 0),
    outstanding: parseFloat(outstandingRes?.total || 0),
    today_collected: parseFloat(todayRes?.total || 0),
    today_transactions: parseInt(todayRes?.count || 0, 10),
    month_collected: parseFloat(monthRes?.total || 0),
    month_transactions: parseInt(monthRes?.count || 0, 10),
    by_collector: byCollector.map((c) => ({
      collected_by: c.collected_by,
      collector_name: c.collector_first_name
        ? `${c.collector_first_name} ${c.collector_last_name}`
        : 'Unassigned',
      total: parseFloat(c.total || 0),
      transaction_count: parseInt(c.transaction_count || 0, 10),
      first_paid_date: c.first_paid_date || null,
      last_paid_date: c.last_paid_date || null,
    })),
  };
}

async function getStudentLedger(tenantId, studentId) {
  const student = await db('users')
    .join('students', 'students.user_id', 'users.id')
    .where({ 'users.id': studentId, 'users.tenant_id': tenantId, 'users.role': 'student' })
    .select(
      'users.id', 'users.first_name', 'users.last_name', 'users.email',
      'students.student_number', 'students.class_id'
    )
    .first();
  if (!student) return null;

  const studentClass = student.class_id
    ? await db('classes').where({ tenant_id: tenantId, id: student.class_id }).select('name').first()
    : null;
  student.class_name = studentClass?.name || null;

  let query = db('fee_structures').where({ tenant_id: tenantId, is_active: true });
  if (student.class_id) {
    query = query.where(function () {
      this.whereNull('class_id').orWhere('class_id', student.class_id);
    });
  } else {
    query = query.whereNull('class_id');
  }
  const structures = await query.orderBy('name');

  const payments = await db('payments')
    .where({ 'payments.tenant_id': tenantId, 'payments.student_id': studentId })
    .leftJoin('fee_structures', 'payments.fee_structure_id', 'fee_structures.id')
    .select('payments.*', 'fee_structures.name as fee_name')
    .orderBy('payments.created_at', 'desc');

  const paidByStructure = {};
  for (const p of payments) {
    const key = p.fee_structure_id || '__unallocated';
    paidByStructure[key] = (paidByStructure[key] || 0) + parseFloat(p.amount_paid || 0);
  }

  const lines = structures.map((f) => {
    const amount = parseFloat(f.amount || 0);
    const paid = paidByStructure[f.id] || 0;
    const balance = Math.max(0, amount - paid);
    return {
      fee_structure_id: f.id,
      name: f.name,
      frequency: f.frequency,
      amount,
      paid,
      balance,
      status: balance <= 0 ? 'paid' : paid > 0 ? 'partial' : 'pending',
    };
  });

  const totalOwed = lines.reduce((s, l) => s + l.amount, 0);
  const totalPaid = lines.reduce((s, l) => s + l.paid, 0);

  return {
    student,
    structures: lines,
    payments,
    total_owed: parseFloat(totalOwed.toFixed(2)),
    total_paid: parseFloat(totalPaid.toFixed(2)),
    total_balance: parseFloat((totalOwed - totalPaid).toFixed(2)),
  };
}

async function getCollectionReport(tenantId, { month, year, fee_structure_id, class_id } = {}) {
  const m = parseInt(month, 10) || new Date().getMonth() + 1;
  const y = parseInt(year, 10) || new Date().getFullYear();

  const activeFees = await db('fee_structures').where({ tenant_id: tenantId, is_active: true }).orderBy('name');
  const selectedFees = fee_structure_id
    ? activeFees.filter((f) => f.id === fee_structure_id)
    : activeFees;
  const feeName = selectedFees.length === 1 ? selectedFees[0].name : 'All Fees';

  const classes = await db('classes')
    .where({ tenant_id: tenantId })
    .orderBy(['level_group', 'grade_level', 'section']);

  const classesFiltered = class_id ? classes.filter((c) => c.id === class_id) : classes;
  const classIdList = classesFiltered.map((c) => c.id);
  const applicableFeeIds = selectedFees.map((f) => f.id);

  let studentsQuery = db('students')
    .where({ 'students.tenant_id': tenantId, 'students.status': 'active' })
    .leftJoin('users', 'students.user_id', 'users.id')
    .select(
      'students.id', 'students.user_id', 'students.student_number',
      'students.class_id', 'students.father_name', 'students.mother_name',
      'users.first_name', 'users.last_name', 'users.phone'
    );
  if (class_id) studentsQuery = studentsQuery.where('students.class_id', class_id);
  const students = await studentsQuery;

  const parentPhones = await db('student_parents')
    .where({ 'student_parents.tenant_id': tenantId })
    .leftJoin('users as parents', 'parents.id', 'student_parents.parent_id')
    .where('parents.role', 'parent')
    .select('student_parents.student_id', 'parents.phone');
  const phoneByStudent = {};
  for (const p of parentPhones) {
    if (!phoneByStudent[p.student_id]) phoneByStudent[p.student_id] = p.phone;
  }

  let paymentsQuery = db('payments')
    .where({ 'payments.tenant_id': tenantId, 'payments.status': 'paid' })
    .whereRaw('EXTRACT(MONTH FROM payments.paid_date) = ?', [m])
    .whereRaw('EXTRACT(YEAR FROM payments.paid_date) = ?', [y]);
  if (fee_structure_id) paymentsQuery = paymentsQuery.where('payments.fee_structure_id', fee_structure_id);
  const payments = await paymentsQuery;

  const paidByStudent = {};
  for (const p of payments) {
    const key = p.student_id;
    if (!paidByStudent[key]) paidByStudent[key] = { total: 0, count: 0, last_date: null, fee_ids: new Set() };
    paidByStudent[key].total += parseFloat(p.amount_paid || 0);
    paidByStudent[key].count += 1;
    if (p.fee_structure_id) paidByStudent[key].fee_ids.add(p.fee_structure_id);
    if (!paidByStudent[key].last_date || new Date(p.paid_date) > new Date(paidByStudent[key].last_date)) {
      paidByStudent[key].last_date = p.paid_date;
    }
  }

  const studentsByClass = {};
  for (const c of classIdList) studentsByClass[c] = [];

  const reportClasses = [];
  let totals = { total_students: 0, collected: 0, unpaid: 0, partial: 0, expected: 0 };

  for (const cls of classesFiltered) {
    const clsStudents = students.filter((s) => s.class_id === cls.id);
    const rows = [];
    let classCollected = 0, classUnpaid = 0, classPartial = 0, classExpected = 0;

    for (const s of clsStudents) {
      let expected = 0;
      for (const f of selectedFees) {
        if (f.class_id && f.class_id !== cls.id) continue;
        expected += parseFloat(f.amount || 0);
      }
      const paidInfo = paidByStudent[s.user_id] || { total: 0, count: 0, last_date: null };
      const paid = paidInfo.total;
      const balance = Math.max(0, expected - paid);
      const status = expected === 0 ? 'n/a' : paid >= expected ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
      if (status === 'paid') classCollected += 1;
      else if (status === 'unpaid') classUnpaid += 1;
      else if (status === 'partial') classPartial += 1;
      classExpected += expected;

      rows.push({
        user_id: s.user_id,
        student_number: s.student_number,
        first_name: s.first_name,
        last_name: s.last_name,
        guardian_phone: phoneByStudent[s.id] || s.phone || null,
        expected: parseFloat(expected.toFixed(2)),
        paid: parseFloat(paid.toFixed(2)),
        balance: parseFloat(balance.toFixed(2)),
        status,
        last_paid_date: paidInfo.last_date,
      });
    }

    const classTotal = rows.reduce((sum, r) => sum + r.paid, 0);
    reportClasses.push({
      class_id: cls.id,
      class_name: cls.name,
      level_group: cls.level_group,
      student_count: rows.length,
      collected_count: classCollected,
      unpaid_count: classUnpaid,
      partial_count: classPartial,
      expected: parseFloat(classExpected.toFixed(2)),
      collected: parseFloat(classTotal.toFixed(2)),
      students: rows,
    });

    totals.total_students += rows.length;
    totals.collected += classTotal;
    totals.unpaid += classUnpaid;
    totals.partial += classPartial;
    totals.expected += classExpected;
  }

  return {
    month: m,
    year: y,
    fee_name: feeName,
    classes: reportClasses,
    totals: {
      total_students: totals.total_students,
      collected: parseFloat(totals.collected.toFixed(2)),
      unpaid_count: totals.unpaid,
      partial_count: totals.partial,
      paid_count: totals.total_students - totals.unpaid - totals.partial,
      expected: parseFloat(totals.expected.toFixed(2)),
    },
  };
}

async function getPaymentTrends(tenantId, year, collectorUserId = null) {
  const y = parseInt(year, 10) || new Date().getFullYear();
  let query = db('payments')
    .where({ 'payments.tenant_id': tenantId })
    .whereRaw('EXTRACT(YEAR FROM payments.paid_date) = ?', [y]);
  if (collectorUserId) query = query.where('payments.collected_by', collectorUserId);

  const rows = await query
    .select(db.raw('EXTRACT(MONTH FROM payments.paid_date) as month'))
    .sum('amount_paid as total')
    .count('* as count')
    .groupByRaw('EXTRACT(MONTH FROM payments.paid_date)')
    .orderByRaw('EXTRACT(MONTH FROM payments.paid_date)');

  const months = [];
  for (let m = 1; m <= 12; m++) {
    const r = rows.find((row) => parseInt(row.month, 10) === m);
    months.push({
      month: m,
      total: parseFloat(r?.total || 0),
      count: parseInt(r?.count || 0, 10),
    });
  }
  return { year: y, months };
}

// ── Accountant Reconciliation & Batch Locking ──
async function listReconciliationBatches(tenantId, { page = 1, limit = 20, date } = {}) {
  let query = db('payment_reconciliation_batches as b')
    .join('users as u', 'b.reconciled_by', 'u.id')
    .leftJoin('users as c', 'b.cashier_id', 'c.id')
    .where('b.tenant_id', tenantId)
    .select(
      'b.*',
      db.raw("CONCAT(u.first_name, ' ', u.last_name) as reconciled_by_name"),
      db.raw("CONCAT(c.first_name, ' ', c.last_name) as cashier_name")
    )
    .orderBy('b.batch_date', 'desc')
    .orderBy('b.created_at', 'desc');

  if (date) query = query.where('b.batch_date', date);

  return paginatedResult(query, { page, limit });
}

async function createReconciliationBatch(tenantId, userId, data) {
  const batchDate = data.batchDate || new Date().toISOString().slice(0, 10);
  const cashierId = data.cashierId || null;

  let paymentsQuery = db('payments')
    .where({ tenant_id: tenantId, reconciliation_locked: false })
    .whereRaw('DATE(paid_date) = ?', [batchDate]);

  if (cashierId) paymentsQuery = paymentsQuery.where('collected_by', cashierId);

  const payments = await paymentsQuery.select('*');

  if (payments.length === 0) {
    const err = new Error('NOTHING_TO_RECONCILE');
    err.code = 'NOTHING_TO_RECONCILE';
    throw err;
  }

  let totalCash = 0;
  let totalTelebirr = 0;
  let totalCbe = 0;
  let totalOther = 0;

  for (const p of payments) {
    const amt = parseFloat(p.amount_paid || 0);
    const method = (p.payment_method || '').toLowerCase();
    if (method === 'cash') totalCash += amt;
    else if (method.includes('telebirr')) totalTelebirr += amt;
    else if (method.includes('cbe') || method.includes('cbe birr') || method.includes('bank')) totalCbe += amt;
    else totalOther += amt;
  }

  const totalAmount = totalCash + totalTelebirr + totalCbe + totalOther;

  const [batch] = await db('payment_reconciliation_batches')
    .insert({
      tenant_id: tenantId,
      batch_date: batchDate,
      reconciled_by: userId,
      cashier_id: cashierId,
      total_cash: totalCash,
      total_telebirr: totalTelebirr,
      total_cbe: totalCbe,
      total_other: totalOther,
      total_amount: totalAmount,
      transaction_count: payments.length,
      notes: data.notes || null,
      status: 'reconciled_and_locked',
    })
    .returning('*');

  if (payments.length > 0) {
    const paymentIds = payments.map((p) => p.id);
    await db('payments')
      .whereIn('id', paymentIds)
      .update({
        is_locked: true,
        reconciliation_locked: true,
        reconciliation_batch_id: batch.id,
      });
  }

  return batch;
}

async function getDefaultersAging(tenantId, { classId } = {}) {
  let query = db('payments as p')
    .join('users as u', 'p.student_id', 'u.id')
    .leftJoin('students as s', 'u.id', 's.user_id')
    .leftJoin('classes as c', 's.class_id', 'c.id')
    .leftJoin('fee_structures as f', 'p.fee_structure_id', 'f.id')
    .where('p.tenant_id', tenantId)
    .whereIn('p.status', ['pending', 'partial', 'overdue'])
    .where('p.balance', '>', 0)
    .select(
      'p.id as payment_id',
      'p.balance as outstanding_balance',
      'p.paid_date',
      'p.created_at',
      'p.status',
      'u.id as student_id',
      'u.first_name',
      'u.last_name',
      'u.phone as parent_phone',
      's.student_number',
      'c.id as class_id',
      'c.name as class_name',
      'f.name as fee_name'
    );

  if (classId) query = query.where('s.class_id', classId);

  const rows = await query;
  const now = new Date();

  let currentTotal = 0;
  let thirtyTotal = 0;
  let sixtyTotal = 0;
  let ninetyPlusTotal = 0;

  const defaulters = rows.map((r) => {
    const createdDate = new Date(r.paid_date || r.created_at);
    const diffDays = Math.max(0, Math.floor((now - createdDate) / (1000 * 60 * 60 * 24)));
    const balance = parseFloat(r.outstanding_balance || 0);

    let bucket = '0-30';
    if (diffDays > 90) {
      bucket = '90+';
      ninetyPlusTotal += balance;
    } else if (diffDays > 60) {
      bucket = '61-90';
      sixtyTotal += balance;
    } else if (diffDays > 30) {
      bucket = '31-60';
      thirtyTotal += balance;
    } else {
      currentTotal += balance;
    }

    return {
      ...r,
      days_overdue: diffDays,
      aging_bucket: bucket,
      outstanding_balance: balance,
    };
  });

  return {
    summary: {
      total_defaulters: defaulters.length,
      total_outstanding: currentTotal + thirtyTotal + sixtyTotal + ninetyPlusTotal,
      current_30_days: currentTotal,
      thirty_to_sixty_days: thirtyTotal,
      sixty_to_ninety_days: sixtyTotal,
      ninety_plus_days: ninetyPlusTotal,
    },
    defaulters,
  };
}

async function getMonthlyClosePack(tenantId, { month, year } = {}) {
  const m = parseInt(month || new Date().getMonth() + 1, 10);
  const y = parseInt(year || new Date().getFullYear(), 10);

  const startDate = new Date(y, m - 1, 1).toISOString().slice(0, 10);
  const endDate = new Date(y, m, 0).toISOString().slice(0, 10);

  // 1. Collections by payment method
  const methodRows = await db('payments')
    .where('tenant_id', tenantId)
    .whereRaw('DATE(paid_date) >= ? AND DATE(paid_date) <= ?', [startDate, endDate])
    .select('payment_method')
    .sum('amount_paid as total')
    .count('* as count')
    .groupBy('payment_method');

  const totalCollected = methodRows.reduce((s, r) => s + parseFloat(r.total || 0), 0);

  // 2. Expenses by category
  const expenseRows = await db('expenses')
    .where('tenant_id', tenantId)
    .whereRaw('DATE(expense_date) >= ? AND DATE(expense_date) <= ?', [startDate, endDate])
    .select('category')
    .sum('amount as total')
    .count('* as count')
    .groupBy('category');

  const totalExpenses = expenseRows.reduce((s, r) => s + parseFloat(r.total || 0), 0);

  // 3. Payroll totals
  const payrollRows = await db('payroll')
    .where({ tenant_id: tenantId, month: m, year: y })
    .select(
      db.raw('SUM(net_pay) as total_net'),
      db.raw('SUM(gross_pay) as total_gross'),
      db.raw('COUNT(*) as staff_count')
    )
    .first();

  const netPayroll = parseFloat(payrollRows?.total_net || 0);
  const totalOutflows = totalExpenses + netPayroll;
  const netOperatingMargin = totalCollected - totalOutflows;

  return {
    period: { month: m, year: y, startDate, endDate },
    revenue: {
      total_collected: totalCollected,
      by_method: methodRows.map((r) => ({
        method: r.payment_method || 'Other',
        total: parseFloat(r.total || 0),
        count: parseInt(r.count || 0, 10),
      })),
    },
    expenses: {
      total_operating_expenses: totalExpenses,
      by_category: expenseRows.map((r) => ({
        category: r.category || 'General',
        total: parseFloat(r.total || 0),
        count: parseInt(r.count || 0, 10),
      })),
    },
    payroll: {
      net_payroll_disbursed: netPayroll,
      gross_payroll: parseFloat(payrollRows?.total_gross || 0),
      staff_count: parseInt(payrollRows?.staff_count || 0, 10),
    },
    net_position: {
      total_inflow: totalCollected,
      total_outflow: totalOutflows,
      net_surplus: netOperatingMargin,
      status: netOperatingMargin >= 0 ? 'surplus' : 'deficit',
    },
  };
}

// ---- Optional-fee subscriptions (per student) ----

async function listStudentFeeSubscriptions(tenantId, { class_id } = {}) {
  const fees = await db('fee_structures')
    .where({ tenant_id: tenantId, is_mandatory: false, is_active: true })
    .select('id', 'name', 'amount', 'frequency')
    .orderBy('name');

  let studentQuery = db('students as s')
    .join('users as u', 's.user_id', 'u.id')
    .leftJoin('classes as c', 's.class_id', 'c.id')
    .where({ 's.tenant_id': tenantId, 's.status': 'active' })
    .select('s.id', 's.student_number', 'u.first_name', 'u.last_name', 'c.name as class_name', 'c.id as class_id')
    .orderBy('u.first_name')
    .orderBy('u.last_name');
  if (class_id) studentQuery = studentQuery.where('s.class_id', class_id);
  const students = await studentQuery;

  const subs = await db('student_fee_subscriptions')
    .where({ tenant_id: tenantId })
    .select('student_id', 'fee_structure_id');
  const map = {};
  for (const s of subs) {
    (map[s.student_id] = map[s.student_id] || []).push(s.fee_structure_id);
  }

  return {
    fees,
    students: students.map((s) => ({ ...s, subscribed_fee_ids: map[s.id] || [] })),
  };
}

async function setStudentFeeSubscription(tenantId, { student_id, fee_structure_id, subscribed }) {
  const student = await db('students').where({ tenant_id: tenantId, id: student_id }).select('id').first();
  if (!student) {
    const err = new Error('STUDENT_NOT_FOUND'); err.code = 'STUDENT_NOT_FOUND'; throw err;
  }
  const fee = await db('fee_structures').where({ tenant_id: tenantId, id: fee_structure_id }).select('id', 'is_mandatory').first();
  if (!fee) {
    const err = new Error('FEE_NOT_FOUND'); err.code = 'FEE_NOT_FOUND'; throw err;
  }
  if (fee.is_mandatory) {
    const err = new Error('FEE_MANDATORY'); err.code = 'FEE_MANDATORY'; throw err;
  }

  if (subscribed) {
    await db('student_fee_subscriptions')
      .insert({ tenant_id: tenantId, student_id, fee_structure_id })
      .onConflict(['student_id', 'fee_structure_id'])
      .ignore();
  } else {
    await db('student_fee_subscriptions')
      .where({ tenant_id: tenantId, student_id, fee_structure_id })
      .del();
  }
  return { student_id, fee_structure_id, subscribed: !!subscribed };
}

// ---- Monthly billing + collection ----
const ethio = require('../../shared/ethiopianCalendar');

function periodKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

async function getFeeSettings(tenantId) {
  const rows = await db('settings')
    .where({ tenant_id: tenantId })
    .whereIn('key', ['fee_grace_days', 'fee_penalty_type', 'fee_penalty_amount']);
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    graceDays: Number(map.fee_grace_days ?? 5) || 0,
    penaltyType: map.fee_penalty_type === 'daily' ? 'daily' : 'fixed',
    penaltyAmount: Number(map.fee_penalty_amount ?? 100) || 0,
  };
}

// Penalty for a given Ethiopian month, based on the admin rules.
function computePenalty({ periodYear, periodMonth, settings, today = new Date() }) {
  const todayEth = ethio.toEthiopian(today);
  const isFuture = periodYear > todayEth.year || (periodYear === todayEth.year && periodMonth > todayEth.month);
  if (isFuture) return 0;
  const range = ethio.ethiopianMonthGregorianRange(periodYear, periodMonth);
  const start = new Date(`${range.start}T00:00:00`);
  const penaltyStart = new Date(start.getTime() + settings.graceDays * 86400000);
  const days = Math.floor((today.getTime() - penaltyStart.getTime()) / 86400000);
  if (days <= 0) return 0;
  return settings.penaltyType === 'daily' ? settings.penaltyAmount * days : settings.penaltyAmount;
}

async function generateMonthlyBills(tenantId, { period_year, period_month, class_id } = {}) {
  const year = Number(period_year);
  const month = Number(period_month);
  if (!year || !month) {
    const e = new Error('PERIOD_REQUIRED'); e.code = 'PERIOD_REQUIRED'; throw e;
  }

  const fees = await db('fee_structures').where({ tenant_id: tenantId, is_active: true, frequency: 'monthly' });
  const feeIds = fees.map((f) => f.id);
  const amounts = feeIds.length
    ? await db('fee_structure_amounts').where({ tenant_id: tenantId }).whereIn('fee_structure_id', feeIds)
    : [];
  const amountMap = {};
  for (const a of amounts) {
    (amountMap[a.fee_structure_id] = amountMap[a.fee_structure_id] || {})[a.grade_level] = parseFloat(a.amount);
  }

  const subs = await db('student_fee_subscriptions').where({ tenant_id: tenantId }).select('student_id', 'fee_structure_id');
  const subMap = {};
  for (const s of subs) (subMap[s.student_id] = subMap[s.student_id] || new Set()).add(s.fee_structure_id);

  let q = db('students as s')
    .join('classes as c', 's.class_id', 'c.id')
    .where({ 's.tenant_id': tenantId, 's.status': 'active' })
    .select('s.id', 's.class_id', 'c.grade_level', 's.enrollment_date');
  if (class_id) q = q.where('s.class_id', class_id);
  const students = await q;

  const range = ethio.ethiopianMonthGregorianRange(year, month);
  const monthEnd = range.end;

  let created = 0;
  await db.transaction(async (trx) => {
    for (const st of students) {
      if (st.enrollment_date && String(st.enrollment_date).slice(0, 10) > monthEnd) continue;
      let total = 0;
      for (const f of fees) {
        if (f.class_id && f.class_id !== st.class_id) continue;
        if (!f.is_mandatory && !(subMap[st.id] && subMap[st.id].has(f.id))) continue;
        const g = st.grade_level;
        const amt = amountMap[f.id] && g != null && amountMap[f.id][g] !== undefined
          ? amountMap[f.id][g]
          : parseFloat(f.amount || 0);
        total += amt;
      }
      const inserted = await trx('student_monthly_bills')
        .insert({ tenant_id: tenantId, student_id: st.id, period_year: year, period_month: month, amount: total, status: 'unpaid' })
        .onConflict(['tenant_id', 'student_id', 'period_year', 'period_month'])
        .ignore()
        .returning('id');
      if (inserted.length) created += 1;
    }
  });
  return { created, period: periodKey(year, month) };
}

async function listMonthlyCollection(tenantId, { period_year, period_month, class_id } = {}) {
  const year = Number(period_year);
  const month = Number(period_month);
  const settings = await getFeeSettings(tenantId);

  let q = db('student_monthly_bills as b')
    .join('students as s', 'b.student_id', 's.id')
    .join('users as u', 's.user_id', 'u.id')
    .leftJoin('classes as c', 's.class_id', 'c.id')
    .where({ 'b.tenant_id': tenantId, 'b.period_year': year, 'b.period_month': month })
    .select('b.*', 'u.first_name', 'u.last_name', 's.student_number', 's.user_id as user_id', 'c.name as class_name');
  if (class_id) q = q.where('s.class_id', class_id);
  const rows = await q.orderBy('u.first_name').orderBy('u.last_name');

  const bills = rows.map((r) => {
    const amount = parseFloat(r.amount || 0);
    const livePenalty = r.status === 'paid'
      ? parseFloat(r.penalty || 0)
      : computePenalty({ periodYear: year, periodMonth: month, settings });
    return { ...r, amount, live_penalty: livePenalty, total_due: amount + livePenalty, period: periodKey(year, month) };
  });

  const paid = bills.filter((b) => b.status === 'paid');
  const unpaid = bills.filter((b) => b.status !== 'paid');
  return {
    period: periodKey(year, month),
    bills,
    summary: {
      total_count: bills.length,
      paid_count: paid.length,
      unpaid_count: unpaid.length,
      expected: bills.reduce((s, b) => s + b.amount, 0),
      collected: paid.reduce((s, b) => s + parseFloat(b.amount_paid || 0), 0),
      outstanding: unpaid.reduce((s, b) => s + b.total_due, 0),
    },
    settings,
  };
}

async function markMonthsPaid(tenantId, userId, { student_id, periods, penalties, payment_method } = {}) {
  if (!student_id || !Array.isArray(periods) || periods.length === 0) {
    const e = new Error('PERIOD_REQUIRED'); e.code = 'PERIOD_REQUIRED'; throw e;
  }
  const student = await db('students').where({ tenant_id: tenantId, id: student_id }).select('id', 'user_id').first();
  if (!student) { const e = new Error('STUDENT_NOT_FOUND'); e.code = 'STUDENT_NOT_FOUND'; throw e; }
  const method = ['cash', 'bank', 'card', 'mobile'].includes(payment_method) ? payment_method : 'cash';
  const settings = await getFeeSettings(tenantId);
  const penInput = penalties || {};
  const result = [];

  await db.transaction(async (trx) => {
    for (const p of periods) {
      const [y, m] = String(p).split('-').map(Number);
      const bill = await trx('student_monthly_bills')
        .where({ tenant_id: tenantId, student_id, period_year: y, period_month: m })
        .first();
      if (!bill) { const e = new Error('BILL_NOT_FOUND'); e.code = 'BILL_NOT_FOUND'; throw e; }
      if (bill.status === 'paid') { result.push({ period: p, already_paid: true }); continue; }

      const amount = parseFloat(bill.amount || 0);
      const computed = computePenalty({ periodYear: y, periodMonth: m, settings });
      const pen = penInput[p] !== undefined && penInput[p] !== null ? Number(penInput[p]) : computed;
      const total = amount + pen;

      await trx('student_monthly_bills').where({ id: bill.id }).update({
        status: 'paid', penalty: pen, amount_paid: total, paid_date: trx.fn.now(), paid_by: userId, updated_at: trx.fn.now(),
      });

      if (total > 0) {
        const receipt_no = await nextReceiptNo(trx, tenantId);
        await trx('payments').insert({
          tenant_id: tenantId,
          student_id: student.user_id,
          fee_structure_id: null,
          amount_paid: total,
          balance: 0,
          status: 'paid',
          payment_method: method,
          paid_date: new Date(),
          billing_period: p,
          receipt_no,
          collected_by: userId,
          remarks: `Monthly fee ${p}${pen > 0 ? ' + penalty' : ''}`,
        });
      }
      result.push({ period: p, amount, penalty: pen, total });
    }
  });
  return { student_id, months: result };
}

async function listStudentBills(tenantId, studentId) {
  const settings = await getFeeSettings(tenantId);
  const rows = await db('student_monthly_bills')
    .where({ tenant_id: tenantId, student_id: studentId })
    .orderBy('period_year')
    .orderBy('period_month');
  return rows.map((r) => {
    const amount = parseFloat(r.amount || 0);
    const pen = r.status === 'paid'
      ? parseFloat(r.penalty || 0)
      : computePenalty({ periodYear: r.period_year, periodMonth: r.period_month, settings });
    return { ...r, amount, live_penalty: pen, total_due: amount + pen, period: periodKey(r.period_year, r.period_month) };
  });
}

module.exports = {
  createFeeStructure, findAllFeeStructures, findFeeStructureById, updateFeeStructure, removeFeeStructure,
  createPayment, createBulkPayments, updatePayment, findAllPayments, findPaymentById, removePayment, getPaymentSummary,
  getStudentLedger, getCollectionReport, getPaymentTrends,
  listReconciliationBatches, createReconciliationBatch, getDefaultersAging, getMonthlyClosePack,
  listStudentFeeSubscriptions, setStudentFeeSubscription,
  generateMonthlyBills, listMonthlyCollection, markMonthsPaid, listStudentBills,
};
