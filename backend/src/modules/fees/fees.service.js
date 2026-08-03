const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');
const broadcast = require('../../socket/broadcast');
const logger = require('../../config/logger');

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
  const [payment] = await db('payments')
    .insert({ ...data, tenant_id: tenantId, collected_by: collectedBy || null })
    .returning('*');
  await notifyPaymentRecorded(tenantId, payment);
  return payment;
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

module.exports = {
  createFeeStructure, findAllFeeStructures, findFeeStructureById, updateFeeStructure, removeFeeStructure,
  createPayment, updatePayment, findAllPayments, findPaymentById, removePayment, getPaymentSummary,
  getStudentLedger, getCollectionReport,
};
