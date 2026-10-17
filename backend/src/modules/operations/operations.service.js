const db = require('../../config/database');

// === BOOKS / LIBRARY ===
const DAY = 86400000;
const today = () => new Date().toISOString().slice(0, 10);

async function getLibrarySettings(tenantId) {
  let s = await db('library_settings').where({ tenant_id: tenantId }).first();
  if (!s) {
    s = { tenant_id: tenantId, loan_days: 14, fine_enabled: false, fine_per_day: 0, grace_days: 0, default_max_books: 2 };
  }
  return s;
}

async function updateLibrarySettings(tenantId, data) {
  const patch = {
    loan_days: data.loan_days != null ? Number(data.loan_days) : undefined,
    fine_enabled: data.fine_enabled !== undefined ? !!data.fine_enabled : undefined,
    fine_per_day: data.fine_per_day != null ? Number(data.fine_per_day) : undefined,
    grace_days: data.grace_days != null ? Number(data.grace_days) : undefined,
    default_max_books: data.default_max_books != null ? Number(data.default_max_books) : undefined,
    updated_at: db.fn.now(),
  };
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
  const existing = await db('library_settings').where({ tenant_id: tenantId }).first();
  if (existing) {
    const [row] = await db('library_settings').where({ tenant_id: tenantId }).update(patch).returning('*');
    return row;
  }
  const [row] = await db('library_settings').insert({ tenant_id: tenantId, ...patch }).returning('*');
  return row;
}

async function listBooks(tenantId, { search, category } = {}) {
  let q = db('books').where({ tenant_id: tenantId });
  if (search) {
    const { applySearch } = require('../../shared/search');
    q = applySearch(q, search, ['title', 'author', 'isbn', 'category', 'shelf', 'publisher'], []);
  }
  if (category) q = q.where({ category });
  return q.orderBy('title');
}

async function listCategories(tenantId) {
  const rows = await db('books').where({ tenant_id: tenantId }).whereNotNull('category').whereNot('category', '')
    .distinct('category').orderBy('category');
  return rows.map((r) => r.category);
}

async function createBook(tenantId, data) {
  const total = Number(data.total_copies) || 1;
  const [book] = await db('books').insert({
    ...data,
    tenant_id: tenantId,
    total_copies: total,
    available_copies: total,
  }).returning('*');
  return book;
}

async function updateBook(tenantId, id, data) {
  const patch = { ...data, updated_at: db.fn.now() };
  if (data.total_copies != null) {
    const current = await db('books').where({ tenant_id: tenantId, id }).first();
    if (current) {
      const borrowed = (current.total_copies || 0) - (current.available_copies || 0);
      patch.total_copies = Number(data.total_copies);
      patch.available_copies = Math.max(0, Number(data.total_copies) - borrowed);
    }
  }
  const [book] = await db('books').where({ tenant_id: tenantId, id }).update(patch).returning('*');
  return book;
}

async function deleteBook(tenantId, id) {
  const active = await db('book_borrowings').where({ tenant_id: tenantId, book_id: id, status: 'borrowed' }).count('* as c').first();
  if (Number(active.c) > 0) {
    const err = new Error('Book has active borrowings');
    err.code = 'HAS_BORROWINGS';
    throw err;
  }
  return db('books').where({ tenant_id: tenantId, id }).del();
}

async function borrowBook(tenantId, userId, data) {
  const book = await db('books').where({ tenant_id: tenantId, id: data.book_id }).first();
  if (!book || book.available_copies < 1) throw new Error('NO_COPIES_AVAILABLE');
  const settings = await getLibrarySettings(tenantId);
  // limit active books per student
  if (data.student_id) {
    const active = await db('book_borrowings').where({ tenant_id: tenantId, student_id: data.student_id, status: 'borrowed' }).count('* as c').first();
    if (Number(active.c) >= Number(settings.default_max_books || 2)) throw new Error('BORROW_LIMIT');
    const dup = await db('book_borrowings').where({ tenant_id: tenantId, student_id: data.student_id, book_id: data.book_id, status: 'borrowed' }).first();
    if (dup) throw new Error('ALREADY_BORROWED');
  }
  let due = data.due_date;
  if (!due) due = new Date(Date.now() + (Number(settings.loan_days) || 14) * DAY).toISOString().slice(0, 10);
  const [borrowing] = await db('book_borrowings').insert({
    tenant_id: tenantId, book_id: data.book_id, student_id: data.student_id,
    borrow_date: today(), due_date: due, issued_by: userId || null, remarks: data.remarks || null, status: 'borrowed',
  }).returning('*');
  await db('books').where({ id: data.book_id }).decrement('available_copies', 1);
  return borrowing;
}

async function returnBook(tenantId, borrowingId, data = {}) {
  const borrowing = await db('book_borrowings').where({ tenant_id: tenantId, id: borrowingId }).first();
  if (!borrowing) throw new Error('NOT_FOUND');
  const settings = await getLibrarySettings(tenantId);
  const retDate = today();
  let fine = 0;
  if (settings.fine_enabled) {
    const late = Math.floor((new Date(retDate) - new Date(borrowing.due_date)) / DAY) - (Number(settings.grace_days) || 0);
    if (late > 0) fine = Math.round(late * Number(settings.fine_per_day || 0) * 100) / 100;
  }
  await db('book_borrowings').where({ id: borrowingId }).update({
    return_date: retDate, status: 'returned', fine_amount: fine,
    returned_condition: data.condition || null,
  });
  await db('books').where({ id: borrowing.book_id }).increment('available_copies', 1);
  return { returned: true, fine_amount: fine };
}

function withDaysLeft(b) {
  const due = b.due_date ? new Date(b.due_date) : null;
  const end = b.return_date ? new Date(b.return_date) : new Date();
  const daysLeft = due ? Math.ceil((due - new Date(today())) / DAY) : null;
  return { ...b, days_left: daysLeft };
}

async function listBorrowings(tenantId, { status, search, from, to } = {}) {
  let q = db('book_borrowings')
    .where({ 'book_borrowings.tenant_id': tenantId })
    .leftJoin('books', 'book_borrowings.book_id', 'books.id')
    .leftJoin('students', 'book_borrowings.student_id', 'students.id')
    .leftJoin('users', 'students.user_id', 'users.id')
    .leftJoin('classes', 'students.class_id', 'classes.id')
    .leftJoin('users as issuer', 'book_borrowings.issued_by', 'issuer.id')
    .select(
      'book_borrowings.*',
      'books.title as book_title', 'books.author', 'books.isbn', 'books.category',
      'students.student_number', 'classes.name as class_name',
      db.raw("concat_ws(' ', users.first_name, users.middle_name, users.last_name) as student_name"),
      db.raw("concat_ws(' ', issuer.first_name, issuer.middle_name, issuer.last_name) as issued_by_name")
    )
    .orderBy('book_borrowings.created_at', 'desc');
  if (status === 'overdue') q = q.where('book_borrowings.status', 'borrowed').whereRaw('book_borrowings.due_date < ?', [today()]);
  else if (status && status !== 'all') q = q.where('book_borrowings.status', status);
  if (from) q = q.where('book_borrowings.borrow_date', '>=', from);
  if (to) q = q.where('book_borrowings.borrow_date', '<=', to);
  if (search) {
    const { phoneDigits } = require('../../shared/search');
    const term = `%${String(search).trim()}%`;
    const digits = phoneDigits(search);
    q = q.where(function () {
      this.where('books.title', 'ilike', term).orWhere('books.author', 'ilike', term).orWhere('books.isbn', 'ilike', term)
        .orWhere('students.student_number', 'ilike', term)
        .orWhereRaw("concat_ws(' ', users.first_name, users.middle_name, users.last_name) ILIKE ?", [term]);
      if (digits) this.orWhereRaw("regexp_replace(coalesce(users.phone, ''), '\\D', '', 'g') LIKE ?", [`%${digits}%`]);
    });
  }
  const rows = await q;
  return rows.map(withDaysLeft);
}

async function myBorrowings(tenantId, studentUserId) {
  const student = await db('students').where({ tenant_id: tenantId, user_id: studentUserId }).first();
  if (!student) return [];
  const rows = await db('book_borrowings').where({ 'book_borrowings.tenant_id': tenantId, 'book_borrowings.student_id': student.id })
    .leftJoin('books', 'book_borrowings.book_id', 'books.id')
    .select('book_borrowings.*', 'books.title as book_title', 'books.author')
    .orderBy('book_borrowings.created_at', 'desc');
  return rows.map(withDaysLeft);
}

async function catalog(tenantId, { search, category } = {}) {
  const books = await listBooks(tenantId, { search, category });
  return books.map((b) => ({ ...b, is_available: Number(b.available_copies) > 0 }));
}

async function libraryStats(tenantId) {
  const todayS = today();
  const [bookAgg] = await db('books').where({ tenant_id: tenantId })
    .select(db.raw('count(*)::int as titles'))
    .select(db.raw('coalesce(sum(total_copies),0)::int as copies'))
    .select(db.raw('coalesce(sum(available_copies),0)::int as available'));
  const borrowAgg = await db('book_borrowings').where({ tenant_id: tenantId })
    .select(db.raw("count(*) filter (where status='borrowed')::int as active"))
    .select(db.raw("count(*) filter (where status='borrowed' and due_date < ?)::int as overdue", [todayS]))
    .select(db.raw("count(*) filter (where status='returned')::int as returned"))
    .select(db.raw('coalesce(sum(fine_amount),0)::float as fines'))
    .first();

  const [byGrade, byClass, topBooks, topBorrowers, recent, categories] = await Promise.all([
    db('book_borrowings as bb').join('students as st', 'bb.student_id', 'st.id').join('classes as c', 'st.class_id', 'c.id')
      .where('bb.tenant_id', tenantId).groupBy('c.level_group', 'c.grade_level')
      .select(db.raw("case when c.level_group='nursery' then 'Nursery' when c.level_group='kg' then (case when c.grade_level=2 then 'UKG' else 'LKG' end) else 'Grade '||c.grade_level end as label"))
      .count('* as value').orderByRaw('min(c.grade_level)'),
    db('book_borrowings as bb').join('students as st', 'bb.student_id', 'st.id').join('classes as c', 'st.class_id', 'c.id')
      .where('bb.tenant_id', tenantId).where('bb.status', 'borrowed').groupBy('c.name', 'c.grade_level')
      .select('c.name as label', 'c.grade_level as grade').count('* as value').orderBy('c.grade_level').limit(15),
    db('book_borrowings as bb').join('books as b', 'bb.book_id', 'b.id').where('bb.tenant_id', tenantId)
      .groupBy('b.id', 'b.title').select('b.title as label').count('* as value').orderBy('value', 'desc').limit(8),
    db('book_borrowings as bb').join('students as st', 'bb.student_id', 'st.id').join('users as u', 'st.user_id', 'u.id')
      .where('bb.tenant_id', tenantId).groupBy('u.first_name', 'u.last_name', 'st.student_number')
      .select(db.raw("u.first_name || ' ' || u.last_name as label"), 'st.student_number').count('* as value').orderBy('value', 'desc').limit(8),
    db('book_borrowings as bb').join('books as b', 'bb.book_id', 'b.id').join('students as st', 'bb.student_id', 'st.id').join('users as u', 'st.user_id', 'u.id')
      .where('bb.tenant_id', tenantId)
      .select('b.title as book', 'u.first_name', 'u.last_name', 'st.student_number', 'bb.borrow_date', 'bb.due_date', 'bb.return_date', 'bb.status', 'bb.fine_amount')
      .orderBy('bb.created_at', 'desc').limit(10),
    db('books').where({ tenant_id: tenantId }).whereNotNull('category').whereNot('category', '')
      .groupBy('category').select('category as label').count('* as value').orderBy('value', 'desc'),
  ]);

  const num = (r) => ({ label: r.label, value: Number(r.value) });
  return {
    titles: bookAgg.titles,
    copies: bookAgg.copies,
    available: bookAgg.available,
    active: borrowAgg.active,
    overdue: borrowAgg.overdue,
    returned: borrowAgg.returned,
    fines: borrowAgg.fines,
    by_grade: byGrade.map(num),
    by_class: byClass.map((r) => ({ label: r.label, value: Number(r.value) })),
    top_books: topBooks.map(num),
    top_borrowers: topBorrowers.map((r) => ({ label: r.label, value: Number(r.value), student_number: r.student_number })),
    categories: categories.map(num),
    recent: recent.map((r) => ({ ...r, student_name: `${[r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ')}`.trim() })),
  };
}

// ---- Library inventory & book assessment ----
const ASSESS_CONDITIONS = ['good', 'damaged', 'under_repair', 'lost', 'repaired', 'found'];

async function libraryInventory(tenantId) {
  const loans = await db('book_borrowings').where({ tenant_id: tenantId, status: 'borrowed' })
    .groupBy('book_id').select('book_id').count('* as c');
  const loanMap = {};
  for (const l of loans) loanMap[l.book_id] = Number(l.c);

  const books = await db('books').where({ tenant_id: tenantId }).orderBy('title');
  const rows = books.map((b) => {
    const damaged = Number(b.damaged_copies) || 0;
    const repair = Number(b.repair_copies) || 0;
    const lost = Number(b.lost_copies) || 0;
    const status = lost > 0 && Number(b.available_copies) === 0 && damaged === 0 && repair === 0 ? 'lost'
      : repair > 0 ? 'under_repair' : damaged > 0 ? 'damaged' : 'good';
    return {
      id: b.id, title: b.title, author: b.author, category: b.category, isbn: b.isbn, shelf: b.shelf,
      total_copies: Number(b.total_copies) || 0, available_copies: Number(b.available_copies) || 0,
      on_loan: loanMap[b.id] || 0, damaged, repair, lost, status, condition_note: b.condition_note,
    };
  });
  const totals = rows.reduce((a, r) => ({
    titles: a.titles + 1, copies: a.copies + r.total_copies, available: a.available + r.available_copies,
    on_loan: a.on_loan + r.on_loan, damaged: a.damaged + r.damaged, repair: a.repair + r.repair, lost: a.lost + r.lost,
  }), { titles: 0, copies: 0, available: 0, on_loan: 0, damaged: 0, repair: 0, lost: 0 });
  return { totals, books: rows };
}

async function listAssessments(tenantId, { book_id, limit = 200 } = {}) {
  let q = db('book_assessments')
    .where({ 'book_assessments.tenant_id': tenantId })
    .leftJoin('books', 'book_assessments.book_id', 'books.id')
    .leftJoin('users as a', 'book_assessments.assessed_by', 'a.id')
    .select('book_assessments.*', 'books.title as book_title', db.raw("concat_ws(' ', a.first_name, a.middle_name, a.last_name) as assessed_by_name"))
    .orderBy('book_assessments.created_at', 'desc')
    .limit(Math.min(500, Number(limit) || 200));
  if (book_id) q = q.where('book_assessments.book_id', book_id);
  return q;
}

async function createAssessment(tenantId, userId, { book_id, condition, copies, note }) {
  if (!ASSESS_CONDITIONS.includes(condition)) throw new Error('BAD_CONDITION');
  const book = await db('books').where({ tenant_id: tenantId, id: book_id }).first();
  if (!book) throw new Error('NOT_FOUND');
  const n = Math.max(1, Number(copies) || 1);
  let { available_copies: avail = 0, damaged_copies: damaged = 0, repair_copies: repair = 0, lost_copies: lost = 0 } = book;
  if (condition === 'damaged') { damaged += n; avail = Math.max(0, avail - n); }
  else if (condition === 'under_repair') { repair += n; avail = Math.max(0, avail - n); }
  else if (condition === 'lost') { lost += n; avail = Math.max(0, avail - n); }
  else if (condition === 'repaired') { repair = Math.max(0, repair - n); avail += n; }
  else if (condition === 'found') { lost = Math.max(0, lost - n); avail += n; }
  // 'good' = no counter change (assessment only)

  const [updated] = await db('books').where({ id: book.id }).update({
    available_copies: avail, damaged_copies: damaged, repair_copies: repair, lost_copies: lost,
    condition_note: note !== undefined ? note : book.condition_note, updated_at: db.fn.now(),
  }).returning('*');

  const [assessment] = await db('book_assessments').insert({
    tenant_id: tenantId, book_id, condition, copies: n, note: note || null, assessed_by: userId || null,
  }).returning('*');
  return { book: updated, assessment };
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
    .select('transport_allocations.*', 'transport_routes.route_name', db.raw("concat_ws(' ', users.first_name, users.middle_name, users.last_name) as student_name"))
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
    .select('hostel_allocations.*', 'hostel_rooms.room_number', 'hostel_rooms.block_name', db.raw("concat_ws(' ', users.first_name, users.middle_name, users.last_name) as student_name"))
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
  listBooks, createBook, updateBook, deleteBook, listCategories,
  borrowBook, returnBook, listBorrowings, myBorrowings, catalog, libraryStats,
  libraryInventory, listAssessments, createAssessment, ASSESS_CONDITIONS,
  getLibrarySettings, updateLibrarySettings,
  listRoutes, createRoute, allocateRoute, listAllocations,
  listRooms, createRoom, allocateRoom, listAllocationsHostel,
  backup, restore, autoGenerateTimetable,
};
