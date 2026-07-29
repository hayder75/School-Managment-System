const db = require('../../config/database');

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

module.exports = { createEntry, getByClass, getByTeacher, updateEntry, deleteEntry };
