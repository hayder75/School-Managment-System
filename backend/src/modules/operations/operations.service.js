const db = require('../../config/database');

// === BOOKS / LIBRARY ===
async function listBooks(tenantId, { search, category } = {}) {
  let q = db('books').where({ tenant_id: tenantId });
  if (search) q = q.where(function () { this.where('title', 'ilike', `%${search}%`).orWhere('author', 'ilike', `%${search}%`); });
  if (category) q = q.where({ category });
  return q.orderBy('title');
}

async function createBook(tenantId, data) {
  const [book] = await db('books').insert({ ...data, tenant_id: tenantId }).returning('*');
  return book;
}

async function borrowBook(tenantId, data) {
  const book = await db('books').where({ tenant_id: tenantId, id: data.book_id }).first();
  if (!book || book.available_copies < 1) throw new Error('NO_COPIES_AVAILABLE');
  const [borrowing] = await db('book_borrowings').insert({
    tenant_id: tenantId, book_id: data.book_id, student_id: data.student_id,
    due_date: data.due_date,
  }).returning('*');
  await db('books').where({ id: data.book_id }).decrement('available_copies', 1);
  return borrowing;
}

async function returnBook(tenantId, borrowingId) {
  const borrowing = await db('book_borrowings').where({ tenant_id: tenantId, id: borrowingId }).first();
  if (!borrowing) throw new Error('NOT_FOUND');
  await db('book_borrowings').where({ id: borrowingId }).update({ return_date: db.fn.now(), status: 'returned' });
  await db('books').where({ id: borrowing.book_id }).increment('available_copies', 1);
  return { returned: true };
}

async function listBorrowings(tenantId) {
  return db('book_borrowings')
    .where({ 'book_borrowings.tenant_id': tenantId })
    .leftJoin('books', 'book_borrowings.book_id', 'books.id')
    .leftJoin('students', 'book_borrowings.student_id', 'students.id')
    .leftJoin('users', 'students.user_id', 'users.id')
    .select('book_borrowings.*', 'books.title as book_title', 'books.author', db.raw("concat(users.first_name, ' ', users.last_name) as student_name"))
    .orderBy('book_borrowings.created_at', 'desc');
}

// === TRANSPORT ===
async function listRoutes(tenantId) {
  return db('transport_routes').where({ tenant_id: tenantId }).orderBy('route_name');
}

async function createRoute(tenantId, data) {
  const [route] = await db('transport_routes').insert({ ...data, tenant_id: tenantId }).returning('*');
  return route;
}

async function allocateRoute(tenantId, data) {
  const route = await db('transport_routes').where({ tenant_id: tenantId, id: data.route_id }).first();
  if (!route) throw new Error('ROUTE_NOT_FOUND');
  const count = await db('transport_allocations').where({ tenant_id: tenantId, route_id: data.route_id }).count('* as c').first();
  if (parseInt(count?.c || 0) >= route.capacity) throw new Error('ROUTE_FULL');
  const [alloc] = await db('transport_allocations').insert({ tenant_id: tenantId, ...data }).returning('*');
  return alloc;
}

async function listAllocations(tenantId) {
  return db('transport_allocations')
    .where({ 'transport_allocations.tenant_id': tenantId })
    .leftJoin('transport_routes', 'transport_allocations.route_id', 'transport_routes.id')
    .leftJoin('students', 'transport_allocations.student_id', 'students.id')
    .leftJoin('users', 'students.user_id', 'users.id')
    .select('transport_allocations.*', 'transport_routes.route_name', db.raw("concat(users.first_name, ' ', users.last_name) as student_name"))
    .orderBy('transport_routes.route_name');
}

// === HOSTEL ===
async function listRooms(tenantId) {
  return db('hostel_rooms').where({ tenant_id: tenantId }).orderBy('block_name').orderBy('room_number');
}

async function createRoom(tenantId, data) {
  const [room] = await db('hostel_rooms').insert({ ...data, tenant_id: tenantId }).returning('*');
  return room;
}

async function allocateRoom(tenantId, data) {
  const room = await db('hostel_rooms').where({ tenant_id: tenantId, id: data.room_id }).first();
  if (!room) throw new Error('ROOM_NOT_FOUND');
  if (room.current_occupancy >= room.capacity) throw new Error('ROOM_FULL');
  const [alloc] = await db('hostel_allocations').insert({ tenant_id: tenantId, ...data }).returning('*');
  await db('hostel_rooms').where({ id: data.room_id }).increment('current_occupancy', 1);
  return alloc;
}

async function listAllocationsHostel(tenantId) {
  return db('hostel_allocations')
    .where({ 'hostel_allocations.tenant_id': tenantId })
    .leftJoin('hostel_rooms', 'hostel_allocations.room_id', 'hostel_rooms.id')
    .leftJoin('students', 'hostel_allocations.student_id', 'students.id')
    .leftJoin('users', 'students.user_id', 'users.id')
    .select('hostel_allocations.*', 'hostel_rooms.room_number', 'hostel_rooms.block_name', db.raw("concat(users.first_name, ' ', users.last_name) as student_name"))
    .orderBy('hostel_rooms.block_name');
}

// === BACKUP & RESTORE ===
async function backup(tenantId) {
  const tables = ['users', 'students', 'classes', 'subjects', 'attendance', 'exams', 'grades', 'timetable_entries', 'fee_structures', 'payments', 'expenses', 'payroll', 'salary_grades', 'books', 'book_borrowings', 'transport_routes', 'transport_allocations', 'hostel_rooms', 'hostel_allocations', 'leaves', 'tax_brackets', 'payroll_audits', 'student_documents', 'student_medical', 'student_discipline', 'student_achievements', 'student_promotions', 'student_transfers', 'student_graduations', 'student_status_history'];
  const data = {};
  for (const t of tables) {
    try { data[t] = await db(t).where({ tenant_id: tenantId }); } catch { data[t] = []; }
  }
  return data;
}

// === TIMETABLE AUTO-GENERATION ===
const TIMETABLE_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function pickAssignment(pool, classId, classSubjectCount, scheduledToday) {
  let candidates = pool.filter((a) => !scheduledToday.has(a.subject_id));
  if (candidates.length === 0) candidates = pool;
  let chosen = candidates[0];
  let best = Infinity;
  for (const a of candidates) {
    const count = classSubjectCount[`${classId}:${a.subject_id}`] || 0;
    if (count < best) {
      best = count;
      chosen = a;
    }
  }
  return chosen;
}

async function autoGenerateTimetable(tenantId) {
  const classes = await db('classes').where({ tenant_id: tenantId });
  const slots = [];
  const busyTeacher = new Set();
  const classSubjectCount = {};

  for (const cls of classes) {
    const assignments = await db('teacher_subjects')
      .where({ 'teacher_subjects.tenant_id': tenantId, 'teacher_subjects.class_id': cls.id })
      .join('users', 'teacher_subjects.teacher_id', 'users.id')
      .where('users.status', 'active')
      .select('teacher_subjects.subject_id', 'teacher_subjects.teacher_id')
      .orderBy('teacher_subjects.is_primary', 'desc');

    if (assignments.length === 0) continue;

    for (let day = 0; day < TIMETABLE_DAYS.length; day++) {
      const scheduledToday = new Set();
      for (let period = 1; period <= 6; period++) {
        const free = assignments.filter((a) => !busyTeacher.has(`${a.teacher_id}:${day}:${period}`));
        const pool = free.length > 0 ? free : assignments;
        const chosen = pickAssignment(pool, cls.id, classSubjectCount, scheduledToday);

        busyTeacher.add(`${chosen.teacher_id}:${day}:${period}`);
        scheduledToday.add(chosen.subject_id);
        classSubjectCount[`${cls.id}:${chosen.subject_id}`] = (classSubjectCount[`${cls.id}:${chosen.subject_id}`] || 0) + 1;

        slots.push({
          tenant_id: tenantId,
          class_id: cls.id,
          subject_id: chosen.subject_id,
          teacher_id: chosen.teacher_id,
          day_of_week: TIMETABLE_DAYS[day],
          start_time: `${String(8 + period).padStart(2, '0')}:00`,
          end_time: `${String(9 + period).padStart(2, '0')}:00`,
          room: `Room ${101 + period}`,
        });
      }
    }
  }

  await db('timetable_entries').where({ tenant_id: tenantId }).del();
  if (slots.length > 0) await db('timetable_entries').insert(slots);
  return { generated: slots.length };
}

async function restore(tenantId, data) {
  const order = ['users', 'students', 'classes', 'subjects', 'attendance', 'exams', 'grades', 'timetable_entries', 'fee_structures', 'payments', 'expenses', 'payroll', 'salary_grades', 'books', 'book_borrowings', 'transport_routes', 'transport_allocations', 'hostel_rooms', 'hostel_allocations', 'leaves', 'tax_brackets', 'payroll_audits', 'student_documents', 'student_medical', 'student_discipline', 'student_achievements', 'student_promotions', 'student_transfers', 'student_graduations', 'student_status_history'];
  for (const t of order) {
    if (data[t] && data[t].length > 0) {
      const filtered = data[t].map(r => { const { id, created_at, updated_at, ...rest } = r; return { ...rest, tenant_id: tenantId }; });
      await db(t).where({ tenant_id: tenantId }).del();
      await db(t).insert(filtered);
    }
  }
  return { restored: true };
}

module.exports = {
  listBooks, createBook, borrowBook, returnBook, listBorrowings,
  listRoutes, createRoute, allocateRoute, listAllocations,
  listRooms, createRoom, allocateRoom, listAllocationsHostel,
  backup, restore, autoGenerateTimetable,
};
