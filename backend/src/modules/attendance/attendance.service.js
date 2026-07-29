const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');

async function mark(tenantId, classId, teacherId, date, records) {
  const rows = records.map((r) => ({
    tenant_id: tenantId,
    student_id: r.student_id,
    class_id: classId,
    date,
    status: r.status,
    marked_by: teacherId,
    remark: r.remark || null,
  }));

  await db('attendance').where({ tenant_id: tenantId, class_id: classId, date }).del();

  if (rows.length > 0) {
    await db('attendance').insert(rows);
  }

  return rows;
}

async function getByClassAndDate(tenantId, classId, date) {
  return db('attendance')
    .where({ 'attendance.tenant_id': tenantId, 'attendance.class_id': classId, 'attendance.date': date })
    .leftJoin('users', 'attendance.student_id', 'users.id')
    .select(
      'attendance.*',
      'users.first_name',
      'users.last_name',
      'users.email'
    )
    .orderBy('users.first_name');
}

async function getByStudent(tenantId, studentId, { page = 1, limit = 50 } = {}) {
  const query = db('attendance')
    .where({ 'attendance.tenant_id': tenantId, 'attendance.student_id': studentId })
    .leftJoin('classes', 'attendance.class_id', 'classes.id')
    .select('attendance.*', 'classes.name as class_name')
    .orderBy('attendance.date', 'desc');

  return paginatedResult(query, page, limit);
}

async function getSummary(tenantId, classId, startDate, endDate) {
  const rows = await db('attendance')
    .where({ tenant_id: tenantId, class_id: classId })
    .whereBetween('date', [startDate, endDate])
    .select('student_id')
    .count('* as total')
    .select(db.raw("COUNT(CASE WHEN status = 'present' THEN 1 END) as present"))
    .select(db.raw("COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent"))
    .select(db.raw("COUNT(CASE WHEN status = 'late' THEN 1 END) as late"))
    .select(db.raw("COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused"))
    .groupBy('student_id');

  return rows;
}

module.exports = { mark, getByClassAndDate, getByStudent, getSummary };
