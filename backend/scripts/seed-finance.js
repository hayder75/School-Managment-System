/* eslint-disable no-console */
/**
 * Mount Olive School — generate realistic 2026 fee payments + expenses.
 *
 * Additive seed: inserts payment rows per student per applicable fee structure
 * and monthly expense rows. Idempotent via deterministic uid() primary keys.
 *
 * Usage: node scripts/seed-finance.js
 */
const crypto = require('crypto');
const knex = require('knex')(require('../src/database/knexfile').development);

const TID = '00000000-0000-0000-0000-000000000001';

function uid(seed) {
  const hex = crypto.createHash('md5').update(String(seed)).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function hash(seed) {
  return parseInt(crypto.createHash('md5').update(String(seed)).digest('hex').slice(0, 8), 16);
}

async function main() {
  const existing = new Set((await knex('payments').select('id')).map((r) => r.id));

  const feeByName = {};
  for (const f of await knex('fee_structures').where({ tenant_id: TID })) feeByName[f.name] = f;

  const feeSets = {
    kg: ['KG Tuition Fee', 'Development Levy', 'Library Fee', 'Sports & Activities'],
    nursery: ['KG Tuition Fee', 'Development Levy', 'Library Fee', 'Sports & Activities'],
    primary: ['Tuition Fee', 'Development Levy', 'Library Fee', 'Sports & Activities'],
  };

  const cashier = await knex('users').where({ tenant_id: TID, role: 'cashier' }).first();
  const admin = await knex('users').where({ tenant_id: TID, role: 'admin' }).first();

  const students = await knex('students')
    .where({ 'students.tenant_id': TID })
    .join('classes', 'classes.id', 'students.class_id')
    .select('students.id', 'students.user_id', 'classes.level_group');

  const payments = [];
  const seen = new Set();
  for (const st of students) {
    const fees = feeSets[st.level_group] || feeSets.primary;
    for (const feeName of fees) {
      const fee = feeByName[feeName];
      if (!fee) continue;
      const key = `pay-${st.id}-${fee.id}`;
      const id = uid(key);
      if (existing.has(id) || seen.has(id)) continue;
      seen.add(id);

      const amount = parseFloat(fee.amount);
      const h = hash(key);
      const month = (h % 12) + 1;
      const day = ((h >> 3) % 27) + 1;
      const date = new Date(Date.UTC(2026, month - 1, day));

      const roll = h % 10;
      if (roll < 7) {
        payments.push({
          id, tenant_id: TID, student_id: st.user_id, fee_structure_id: fee.id,
          amount_paid: amount, balance: 0, status: 'paid',
          due_date: fee.due_date || null, paid_date: date, transaction_id: `TXN-${uid(key)}`,
          payment_method: h % 3 === 0 ? 'bank' : 'cash', remarks: null, collected_by: cashier.id, created_at: date,
        });
      } else if (roll < 8.5) {
        const partial = Math.round(amount * 0.5 * 100) / 100;
        payments.push({
          id, tenant_id: TID, student_id: st.user_id, fee_structure_id: fee.id,
          amount_paid: partial, balance: +(amount - partial).toFixed(2), status: 'partial',
          due_date: fee.due_date || null, paid_date: date, transaction_id: `TXN-${uid(key)}`,
          payment_method: 'cash', remarks: null, collected_by: cashier.id, created_at: date,
        });
      } else {
        payments.push({
          id, tenant_id: TID, student_id: st.user_id, fee_structure_id: fee.id,
          amount_paid: 0, balance: amount, status: 'pending',
          due_date: fee.due_date || null, paid_date: null, transaction_id: null,
          payment_method: null, remarks: null, collected_by: null, created_at: new Date(),
        });
      }
    }
  }

  const expenseCats = ['Salaries', 'Utilities', 'Supplies', 'Maintenance', 'Transport', 'Other'];
  const expenses = [];
  for (let month = 1; month <= 12; month++) {
    const count = 3 + (hash(`exp-${month}`) % 4);
    for (let i = 0; i < count; i++) {
      const cat = expenseCats[(hash(`exp-${month}-${i}`) + i) % expenseCats.length];
      const amount = [15000, 8000, 5000, 3000, 2000, 12000, 6000][(hash(`exp-${month}-${i}`) + i) % 7];
      const day = ((hash(`exp-${month}-${i}`) >> 3) % 27) + 1;
      const date = new Date(Date.UTC(2026, month - 1, day));
      expenses.push({
        id: uid(`exp-${month}-${i}`), tenant_id: TID, category: cat,
        description: `${cat} — ${new Date(2000, month - 1).toLocaleString('default', { month: 'long' })} 2026`,
        amount, expense_date: date, paid_to: null, receipt_url: null, created_by: admin.id, created_at: date,
      });
    }
  }

  console.log(`Payments to insert: ${payments.length}`);
  console.log(`Expenses to insert: ${expenses.length}`);
  if (payments.length) {
    await knex.batchInsert('payments', payments, 500);
  }
  if (expenses.length) {
    await knex.batchInsert('expenses', expenses, 200);
  }
  console.log('Finance seed complete.');
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
