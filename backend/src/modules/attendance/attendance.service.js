const db = require('../../config/database');
const { paginatedResult } = require('../../shared/pagination');
const broadcast = require('../../socket/broadcast');
const logger = require('../../config/logger');

async function mark(tenantId, classId, teacherId, date, records) {
  const unique = [];
  const seen = new Set();
  for (const r of records) {
    if (!seen.has(r.student_id)) {
      seen.add(r.student_id);
      unique.push(r);
    }
  }

  const studentIds = unique.map((r) => r.student_id);
  const classStudents = await db('students')
    .where({ tenant_id: tenantId, class_id: classId })
    .whereIn('user_id', studentIds)
    .select('user_id');
  const validIds = new Set(classStudents.map((s) => s.user_id));

  const rows = unique
    .filter((r) => validIds.has(r.student_id))
    .map((r) => ({
      tenant_id: tenantId,
      student_id: r.student_id,
      class_id: classId,
      date,
      status: r.status,
      marked_by: teacherId,
      remark: r.remark || null,
    }));

  await db.transaction(async (trx) => {
    const existing = await trx('attendance')
      .where({ tenant_id: tenantId, class_id: classId, date })
      .whereIn('student_id', studentIds)
      .select('student_id');

    for (const row of rows) {
      if (existing.some((e) => e.student_id === row.student_id)) {
        await trx('attendance')
          .where({ tenant_id: tenantId, class_id: classId, date, student_id: row.student_id })
          .update({
            status: row.status,
            marked_by: row.marked_by,
            remark: row.remark,
          });
      } else {
        await trx('attendance').insert(row);
      }
    }
  });

  await notifyAttendanceMarked(tenantId, classId, date, rows);

  return rows;
}

async function notifyAttendanceMarked(tenantId, classId, date, rows) {
  try {
    const notable = rows.filter((r) => r.status === 'absent' || r.status === 'late');
    if (notable.length === 0) return;
    const studentIds = notable.map((r) => r.student_id);
    const statusLabel = notable.length === 1 ? notable[0].status : 'absent/late';

    await broadcast.notifyUsers(tenantId, studentIds, {
      title: 'Attendance Update',
      message: `You were marked ${statusLabel} on ${date}.`,
      type: 'attendance',
      refType: 'attendance',
      refId: classId,
    });

    const parentRows = await db('student_parents')
      .join('students', 'student_parents.student_id', 'students.id')
      .where({ 'student_parents.tenant_id': tenantId })
      .whereIn('students.user_id', studentIds)
      .select('student_parents.parent_id');

    await broadcast.notifyUsers(tenantId, parentRows.map((p) => p.parent_id), {
      title: 'Attendance Update',
      message: `Your child was marked ${statusLabel} on ${date}.`,
      type: 'attendance',
      refType: 'attendance',
      refId: classId,
    });
  } catch (err) {
    logger.error('Attendance notification error', { error: err.message });
  }
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

function rate(pct) {
  return Number.isFinite(pct) ? parseFloat(pct.toFixed(1)) : 0;
}

async function getAdminOverview(tenantId, { fromDate, toDate, classId } = {}) {
  function scope(q) {
    if (fromDate) q = q.where('attendance.date', '>=', fromDate);
    if (toDate) q = q.where('attendance.date', '<=', toDate);
    if (classId) q = q.where('attendance.class_id', classId);
    return q;
  }

  const [summaryRow] = await scope(db('attendance').where({ 'attendance.tenant_id': tenantId }))
    .select(
      db.raw('COUNT(*)::int as total'),
      db.raw('COUNT(DISTINCT attendance.student_id)::int as students'),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'present')::int as present"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'absent')::int as absent"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'late')::int as late"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'excused')::int as excused")
    );

  const total = parseInt(summaryRow?.total || 0, 10);
  const summary = {
    total,
    students: parseInt(summaryRow?.students || 0, 10),
    present: parseInt(summaryRow?.present || 0, 10),
    absent: parseInt(summaryRow?.absent || 0, 10),
    late: parseInt(summaryRow?.late || 0, 10),
    excused: parseInt(summaryRow?.excused || 0, 10),
  };
  summary.present_rate = rate((summary.present / total) * 100);
  summary.absent_rate = rate((summary.absent / total) * 100);
  summary.late_rate = rate((summary.late / total) * 100);
  summary.excused_rate = rate((summary.excused / total) * 100);

  const byClass = await scope(db('attendance').where({ 'attendance.tenant_id': tenantId })
    .leftJoin('classes', 'attendance.class_id', 'classes.id'))
    .select(
      'classes.id as class_id',
      'classes.name as class_name',
      'classes.level_group',
      'classes.grade_level',
      db.raw('COUNT(*)::int as total'),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'present')::int as present"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'absent')::int as absent"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'late')::int as late"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'excused')::int as excused")
    )
    .groupBy('classes.id', 'classes.name', 'classes.level_group', 'classes.grade_level')
    .orderByRaw('absent DESC');

  byClass.forEach((c) => {
    c.absent_rate = rate((c.absent / c.total) * 100);
  });

  const trend = await scope(db('attendance').where({ 'attendance.tenant_id': tenantId }))
    .select(
      'attendance.date',
      db.raw('COUNT(*)::int as total'),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'present')::int as present"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'absent')::int as absent"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'late')::int as late")
    )
    .groupBy('attendance.date')
    .orderBy('attendance.date');

  const topAbsent = await scope(db('attendance').where({ 'attendance.tenant_id': tenantId })
    .leftJoin('users', 'attendance.student_id', 'users.id')
    .leftJoin('students', 'users.id', 'students.user_id')
    .leftJoin('classes', 'students.class_id', 'classes.id'))
    .select(
      'users.id as student_id',
      'users.first_name',
      'users.last_name',
      'classes.name as class_name',
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'absent')::int as absent"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'late')::int as late"),
      db.raw('COUNT(*)::int as total')
    )
    .groupBy('users.id', 'users.first_name', 'users.last_name', 'classes.name')
    .orderByRaw('absent DESC, late DESC')
    .limit(15);

  topAbsent.forEach((s) => {
    s.absent_rate = rate((s.absent / s.total) * 100);
  });

  return { summary, by_class: byClass, trend, top_absent: topAbsent };
}

async function getAdminClassOverview(tenantId, classId, { fromDate, toDate } = {}) {
  const cls = await db('classes').where({ tenant_id: tenantId, id: classId }).first();
  if (!cls) return null;

  let q = db('attendance').where({ 'attendance.tenant_id': tenantId, 'attendance.class_id': classId });
  if (fromDate) q = q.where('attendance.date', '>=', fromDate);
  if (toDate) q = q.where('attendance.date', '<=', toDate);

  const [summaryRow] = await q.clone()
    .select(
      db.raw('COUNT(*)::int as total'),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'present')::int as present"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'absent')::int as absent"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'late')::int as late"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'excused')::int as excused")
    );

  const total = parseInt(summaryRow?.total || 0, 10);
  const summary = {
    total,
    present: parseInt(summaryRow?.present || 0, 10),
    absent: parseInt(summaryRow?.absent || 0, 10),
    late: parseInt(summaryRow?.late || 0, 10),
    excused: parseInt(summaryRow?.excused || 0, 10),
  };
  summary.present_rate = rate((summary.present / total) * 100);
  summary.absent_rate = rate((summary.absent / total) * 100);
  summary.late_rate = rate((summary.late / total) * 100);
  summary.excused_rate = rate((summary.excused / total) * 100);

  const students = await q.clone()
    .leftJoin('users', 'attendance.student_id', 'users.id')
    .select(
      'users.id as student_id',
      'users.first_name',
      'users.last_name',
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'present')::int as present"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'absent')::int as absent"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'late')::int as late"),
      db.raw("COUNT(*) FILTER (WHERE attendance.status = 'excused')::int as excused"),
      db.raw('COUNT(*)::int as total')
    )
    .groupBy('users.id', 'users.first_name', 'users.last_name')
    .orderByRaw('absent DESC, late DESC');

  students.forEach((s) => {
    s.absent_rate = rate((s.absent / s.total) * 100);
    s.present_rate = rate((s.present / s.total) * 100);
  });

  return {
    class: { id: cls.id, name: cls.name, level_group: cls.level_group, grade_level: cls.grade_level, section: cls.section },
    summary,
    students,
  };
}

module.exports = { mark, getByClassAndDate, getByStudent, getSummary, getAdminOverview, getAdminClassOverview };
