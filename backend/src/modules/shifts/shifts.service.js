const knex = require('../../config/database');
const notifService = require('../notifications/notifications.service');

async function listSubstitutions(tenantId, { date, status, teacherId } = {}) {
  let query = knex('teacher_substitutions as s')
    .join('users as orig', 's.original_teacher_id', 'orig.id')
    .join('users as sub', 's.substitute_teacher_id', 'sub.id')
    .leftJoin('users as creator', 's.created_by', 'creator.id')
    .where('s.tenant_id', tenantId)
    .select(
      's.*',
      knex.raw("CONCAT(orig.first_name, ' ', orig.last_name) as original_teacher_name"),
      'orig.email as original_teacher_email',
      knex.raw("CONCAT(sub.first_name, ' ', sub.last_name) as substitute_teacher_name"),
      'sub.email as substitute_teacher_email',
      knex.raw("CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name")
    )
    .orderBy('s.date', 'desc')
    .orderBy('s.created_at', 'desc');

  if (date) query = query.where('s.date', date);
  if (status && status !== 'all') query = query.where('s.status', status);
  if (teacherId) {
    query = query.where((builder) => {
      builder.where('s.original_teacher_id', teacherId).orWhere('s.substitute_teacher_id', teacherId);
    });
  }

  return await query;
}

async function getAvailableTeachers(tenantId) {
  const teachers = await knex('users')
    .where({ tenant_id: tenantId, role: 'teacher', status: 'active' })
    .select('id', 'first_name', 'last_name', 'email', 'phone', 'job_title')
    .orderBy('first_name', 'asc');

  return teachers;
}

async function createSubstitution(tenantId, userId, data) {
  const [sub] = await knex('teacher_substitutions')
    .insert({
      tenant_id: tenantId,
      original_teacher_id: data.originalTeacherId,
      substitute_teacher_id: data.substituteTeacherId,
      date: data.date,
      period_name: data.periodName,
      reason: data.reason || 'Sick Leave / Absence Coverage',
      status: data.status || 'scheduled',
      notes: data.notes || null,
      created_by: userId,
    })
    .returning('*');

  try {
    const [orig] = await knex('users').where('id', data.originalTeacherId).select('first_name', 'last_name');
    await notifService.create(
      tenantId, data.substituteTeacherId,
      'Substitution assignment',
      `You are covering ${orig ? `${orig.first_name} ${orig.last_name}` : 'a teacher'} on ${data.date}, ${data.periodName}.`,
      'info', 'substitution', sub.id
    );
  } catch (e) { console.error('notify failed', e.message); }

  return sub;
}

async function updateSubstitutionStatus(tenantId, subId, status) {
  const [updated] = await knex('teacher_substitutions')
    .where({ id: subId, tenant_id: tenantId })
    .update({
      status,
      updated_at: knex.fn.now(),
    })
    .returning('*');

  return updated;
}

async function getLiveShiftRoster(tenantId, { date } = {}) {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  // 1. All teachers/staff in tenant
  const staff = await knex('users')
    .where('tenant_id', tenantId)
    .whereIn('role', ['teacher', 'admin', 'shift_coordinator', 'quality_director', 'support'])
    .where('status', 'active')
    .select('id', 'first_name', 'last_name', 'email', 'phone', 'role', 'job_title')
    .orderBy('first_name', 'asc');

  // 2. Attendance for today
  const attendanceRows = await knex('staff_attendance')
    .where({ tenant_id: tenantId, date: targetDate });
  const attendanceMap = new Map(attendanceRows.map((a) => [a.staff_id, a]));

  // 3. Approved leaves for today
  const approvedLeaves = await knex('leaves')
    .where('tenant_id', tenantId)
    .where('status', 'approved')
    .where('start_date', '<=', targetDate)
    .where('end_date', '>=', targetDate);
  const leaveMap = new Map(approvedLeaves.map((l) => [l.staff_id, l]));

  // 4. Substitutions for today
  const substitutions = await knex('teacher_substitutions as s')
    .join('users as orig', 's.original_teacher_id', 'orig.id')
    .join('users as sub', 's.substitute_teacher_id', 'sub.id')
    .where('s.tenant_id', tenantId)
    .where('s.date', targetDate)
    .select(
      's.*',
      knex.raw("CONCAT(orig.first_name, ' ', orig.last_name) as original_teacher_name"),
      knex.raw("CONCAT(sub.first_name, ' ', sub.last_name) as substitute_teacher_name")
    );

  // Merge into structured roster
  let presentCount = 0;
  let onLeaveCount = 0;
  let absentCount = 0;

  const roster = staff.map((s) => {
    const att = attendanceMap.get(s.id);
    const leave = leaveMap.get(s.id);
    const myOrigSubs = substitutions.filter((sub) => sub.original_teacher_id === s.id);
    const myCoverSubs = substitutions.filter((sub) => sub.substitute_teacher_id === s.id);

    let status = 'not_checked_in';
    if (leave) {
      status = 'on_leave';
      onLeaveCount++;
    } else if (att) {
      status = att.status; // present, late, absent, half_day
      if (status === 'present' || status === 'late' || status === 'half_day') presentCount++;
      else if (status === 'absent') absentCount++;
    }

    return {
      staffId: s.id,
      name: `${s.first_name} ${s.last_name}`,
      email: s.email,
      phone: s.phone,
      role: s.role,
      jobTitle: s.job_title || s.role,
      status,
      checkInTime: att?.check_in || null,
      checkOutTime: att?.check_out || null,
      leaveInfo: leave ? { leaveType: leave.leave_type, reason: leave.reason } : null,
      coveredByOthers: myOrigSubs,
      coveringForOthers: myCoverSubs,
    };
  });

  return {
    date: targetDate,
    totalStaff: staff.length,
    presentCount,
    onLeaveCount,
    absentCount,
    roster,
    substitutions,
  };
}

// ── Guard Shifts (ፈረቃ) ──
async function listGuardShifts(tenantId, { date, shiftType, status } = {}) {
  let query = knex('guard_shifts as g')
    .join('users as u', 'g.guard_user_id', 'u.id')
    .leftJoin('users as a', 'g.assigned_by', 'a.id')
    .where('g.tenant_id', tenantId)
    .select(
      'g.*',
      knex.raw("CONCAT(u.first_name, ' ', u.last_name) as guard_name"),
      'u.email as guard_email',
      'u.phone as guard_phone',
      knex.raw("CONCAT(a.first_name, ' ', a.last_name) as assigned_by_name")
    )
    .orderBy('g.shift_date', 'desc')
    .orderBy('g.created_at', 'desc');

  if (date) query = query.where('g.shift_date', date);
  if (shiftType && shiftType !== 'all') query = query.where('g.shift_type', shiftType);
  if (status && status !== 'all') query = query.where('g.status', status);

  return await query;
}

async function createGuardShift(tenantId, userId, data) {
  const startTime = data.startTime || data.start_time || '06:00';
  const endTime = data.endTime || data.end_time || '18:00';
  // shift_type kept as a label for the unique constraint; derived from times
  const shiftType = data.shiftType || `${startTime}-${endTime}`;

  const [created] = await knex('guard_shifts')
    .insert({
      tenant_id: tenantId,
      guard_user_id: data.guardUserId,
      shift_date: data.shiftDate,
      shift_type: shiftType,
      start_time: startTime,
      end_time: endTime,
      post_location: data.postLocation || 'Main Gate',
      status: data.status || 'scheduled',
      assigned_by: userId,
      notes: data.notes || null,
    })
    .onConflict(['tenant_id', 'guard_user_id', 'shift_date', 'shift_type'])
    .merge()
    .returning('*');

  return created;
}

async function updateGuardShift(tenantId, id, data) {
  const [updated] = await knex('guard_shifts')
    .where({ id, tenant_id: tenantId })
    .update({
      post_location: data.postLocation,
      status: data.status,
      notes: data.notes,
      start_time: data.startTime || data.start_time,
      end_time: data.endTime || data.end_time,
      updated_at: knex.fn.now(),
    })
    .returning('*');

  return updated;
}

async function deleteGuardShift(tenantId, id) {
  await knex('guard_shifts').where({ id, tenant_id: tenantId }).del();
  return true;
}

async function getShiftReports(tenantId) {
  const totalSubstitutions = await knex('teacher_substitutions')
    .where('tenant_id', tenantId)
    .count('* as count');

  const topSubstitutes = await knex('teacher_substitutions as s')
    .join('users as sub', 's.substitute_teacher_id', 'sub.id')
    .where('s.tenant_id', tenantId)
    .where('s.status', 'completed')
    .select(
      'sub.id',
      knex.raw("CONCAT(sub.first_name, ' ', sub.last_name) as teacher_name"),
      knex.raw('COUNT(*)::integer as coverage_count')
    )
    .groupBy('sub.id', 'sub.first_name', 'sub.last_name')
    .orderBy('coverage_count', 'desc')
    .limit(5);

  const statusBreakdown = await knex('teacher_substitutions')
    .where('tenant_id', tenantId)
    .select('status')
    .count('* as count')
    .groupBy('status');

  const guardShiftsToday = await knex('guard_shifts')
    .where('tenant_id', tenantId)
    .where('shift_date', new Date().toISOString().slice(0, 10))
    .count('* as count')
    .first();

  return {
    totalSubstitutions: parseInt(totalSubstitutions[0]?.count || 0, 10),
    topSubstitutes,
    statusBreakdown,
    activeGuardShifts: parseInt(guardShiftsToday?.count || 0, 10),
  };
}

module.exports = {
  listSubstitutions,
  getAvailableTeachers,
  createSubstitution,
  updateSubstitutionStatus,
  getLiveShiftRoster,
  listGuardShifts,
  createGuardShift,
  updateGuardShift,
  deleteGuardShift,
  getShiftReports,
};
