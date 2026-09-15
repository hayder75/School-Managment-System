const db = require('../../config/database');

// Find an existing entry that overlaps the given class slot (or teacher's schedule).
async function findConflict(tenantId, { class_id, teacher_id, day_of_week, start_time, end_time, excludeId } = {}) {
  const overlaps = (q) => q
    .where('timetable_entries.tenant_id', tenantId)
    .where('timetable_entries.day_of_week', day_of_week)
    .whereRaw('timetable_entries.start_time < ?::time', [end_time])
    .whereRaw('timetable_entries.end_time > ?::time', [start_time]);

  let classQ = overlaps(db('timetable_entries').where('timetable_entries.class_id', class_id));
  if (excludeId) classQ = classQ.whereNot('timetable_entries.id', excludeId);
  classQ = classQ
    .leftJoin('subjects', 'timetable_entries.subject_id', 'subjects.id')
    .leftJoin('users', 'timetable_entries.teacher_id', 'users.id')
    .select(
      'timetable_entries.start_time',
      'timetable_entries.end_time',
      'subjects.name as subject_name',
      db.raw("CONCAT(users.first_name, ' ', users.last_name) as teacher_name")
    )
    .first();
  const classConflict = await classQ;
  if (classConflict) return { scope: 'class', ...classConflict };

  if (teacher_id) {
    let teacherQ = overlaps(db('timetable_entries').where('timetable_entries.teacher_id', teacher_id));
    if (excludeId) teacherQ = teacherQ.whereNot('timetable_entries.id', excludeId);
    teacherQ = teacherQ
      .leftJoin('subjects', 'timetable_entries.subject_id', 'subjects.id')
      .leftJoin('classes', 'timetable_entries.class_id', 'classes.id')
      .select(
        'timetable_entries.start_time',
        'timetable_entries.end_time',
        'subjects.name as subject_name',
        'classes.name as class_name'
      )
      .first();
    const teacherConflict = await teacherQ;
    if (teacherConflict) return { scope: 'teacher', ...teacherConflict };
  }

  return null;
}

async function createEntry(tenantId, data) {
  const [entry] = await db('timetable_entries')
    .insert({ ...data, tenant_id: tenantId })
    .returning('*');
  return entry;
}

async function getByClass(tenantId, classId) {
  return db('timetable_entries')
    .where({ 'timetable_entries.tenant_id': tenantId, 'timetable_entries.class_id': classId })
    .leftJoin('subjects', 'timetable_entries.subject_id', 'subjects.id')
    .leftJoin('users', 'timetable_entries.teacher_id', 'users.id')
    .select(
      'timetable_entries.*',
      'subjects.name as subject_name',
      'subjects.code as subject_code',
      'users.first_name as teacher_first_name',
      'users.last_name as teacher_last_name'
    )
    .orderByRaw("CASE day_of_week WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6 END")
    .orderBy('start_time');
}

async function getByTeacher(tenantId, teacherId) {
  return db('timetable_entries')
    .where({ 'timetable_entries.tenant_id': tenantId, 'timetable_entries.teacher_id': teacherId })
    .leftJoin('subjects', 'timetable_entries.subject_id', 'subjects.id')
    .leftJoin('classes', 'timetable_entries.class_id', 'classes.id')
    .select(
      'timetable_entries.*',
      'subjects.name as subject_name',
      'classes.name as class_name'
    )
    .orderByRaw("CASE day_of_week WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6 END")
    .orderBy('start_time');
}

async function updateEntry(tenantId, id, data) {
  data.updated_at = db.fn.now();
  const [entry] = await db('timetable_entries')
    .where({ tenant_id: tenantId, id })
    .update(data)
    .returning('*');
  return entry;
}

async function deleteEntry(tenantId, id) {
  return db('timetable_entries').where({ tenant_id: tenantId, id }).del();
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

async function markTestDay(tenantId, { class_id, subject_id, date, teacherId }) {
  const d = new Date(`${date}T00:00:00`);
  const day_of_week = DAYS[d.getDay()];
  const teacher = await db('teacher_subjects')
    .where({ tenant_id: tenantId, class_id, subject_id })
    .select('teacher_id')
    .first();
  const tid = teacherId || teacher?.teacher_id || null;

  const existing = await db('timetable_entries')
    .where({ tenant_id: tenantId, class_id, subject_id, day_of_week })
    .first();
  if (existing) {
    const [upd] = await db('timetable_entries')
      .where({ id: existing.id })
      .update({ is_test: true, teacher_id: tid, updated_at: db.fn.now() })
      .returning('*');
    return upd;
  }
  const [entry] = await db('timetable_entries').insert({
    tenant_id: tenantId,
    class_id,
    subject_id,
    teacher_id: tid,
    day_of_week,
    start_time: '08:00',
    end_time: '09:00',
    is_test: true,
  }).returning('*');
  return entry;
}

module.exports = { createEntry, getByClass, getByTeacher, updateEntry, deleteEntry, markTestDay, findConflict };
