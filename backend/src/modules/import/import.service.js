const db = require('../../config/database');
const bcrypt = require('bcrypt');

async function importStudents(tenantId, records) {
  const results = { created: 0, skipped: 0, errors: [] };
  for (const row of records) {
    try {
      if (!row.email || !row.first_name || !row.last_name) {
        results.skipped++;
        continue;
      }
      const existing = await db('users').where({ tenant_id: tenantId, email: row.email }).first();
      if (existing) {
        results.skipped++;
        continue;
      }
      const [user] = await db('users').insert({
        tenant_id: tenantId,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        role: 'student',
        status: 'active',
        password_hash: await bcrypt.hash('changeme123', 10),
      }).returning('id');

      if (row.class_name) {
        const cls = await db('classes').where({ tenant_id: tenantId, name: row.class_name }).first();
        if (cls) {
          await db('students').insert({
            tenant_id: tenantId,
            user_id: user.id,
            class_id: cls.id,
            student_number: row.student_number || null,
            enrollment_date: new Date(),
            status: 'active',
          });
        }
      }
      results.created++;
    } catch (err) {
      results.errors.push({ row, error: err.message });
    }
  }
  return results;
}

async function importTeachers(tenantId, records) {
  const results = { created: 0, skipped: 0, errors: [] };
  for (const row of records) {
    try {
      if (!row.email || !row.first_name || !row.last_name) {
        results.skipped++;
        continue;
      }
      const existing = await db('users').where({ tenant_id: tenantId, email: row.email }).first();
      if (existing) {
        results.skipped++;
        continue;
      }
      await db('users').insert({
        tenant_id: tenantId,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        role: 'teacher',
        status: 'active',
        password_hash: await bcrypt.hash('changeme123', 10),
      });
      results.created++;
    } catch (err) {
      results.errors.push({ row, error: err.message });
    }
  }
  return results;
}

async function importPayments(tenantId, records) {
  const results = { created: 0, skipped: 0, errors: [] };
  for (const row of records) {
    try {
      if (!row.email || !row.amount_paid) {
        results.skipped++;
        continue;
      }
      const student = await db('users').where({ tenant_id: tenantId, email: row.email, role: 'student' }).first();
      if (!student) {
        results.skipped++;
        continue;
      }
      await db('payments').insert({
        tenant_id: tenantId,
        student_id: student.id,
        amount_paid: parseFloat(row.amount_paid),
        paid_date: row.paid_date ? new Date(row.paid_date) : new Date(),
        payment_method: row.payment_method || 'cash',
        status: 'paid',
      });
      results.created++;
    } catch (err) {
      results.errors.push({ row, error: err.message });
    }
  }
  return results;
}

module.exports = { importStudents, importTeachers, importPayments };
