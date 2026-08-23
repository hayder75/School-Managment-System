/* Seeds realistic demo data for all role subsystems so pages have life.
   Safe to re-run: skips if data already present. */
const knex = require('../src/config/database');

const TENANT = '00000000-0000-0000-0000-000000000001';

async function pickTeachers(limit) {
  return await knex('users')
    .where({ tenant_id: TENANT, role: 'teacher', status: 'active' })
    .select('id', 'first_name', 'last_name')
    .orderBy('email')
    .limit(limit);
}

async function staffByRole(role, limit = 5) {
  return await knex('users')
    .where({ tenant_id: TENANT, role, status: 'active' })
    .select('id', 'first_name', 'last_name')
    .limit(limit);
}

async function firstClassSubject() {
  const cls = await knex('classes').where('tenant_id', TENANT).select('id').first();
  const sub = await knex('subjects').where('tenant_id', TENANT).select('id').first();
  const qd = await knex('users').where({ tenant_id: TENANT, role: 'quality_director' }).select('id').first();
  return { classId: cls?.id || null, subjectId: sub?.id || null, reviewerId: qd?.id || null };
}

function daysAgo(n) { return new Date(Date.now() - n * 86400000); }
function dateStr(n) { return daysAgo(n).toISOString().slice(0, 10); }

async function seedSubmissions(teachers, ctx) {
  const existing = await knex('content_submissions').where('tenant_id', TENANT).count('* as c');
  if (Number(existing[0].c) > 4) return console.log('submissions: already seeded');

  const types = ['test', 'exam', 'notes', 'lesson_plan', 'worksheet'];
  const titles = [
    'Algebra Quiz — Linear Equations', 'Mid-Semester Exam Draft (Maths)', 'Biology Notes — Cell Division',
    'Lesson Plan: Photosynthesis', 'Worksheet: Fractions Practice', 'English Comprehension Test',
    'History Notes — Battle of Adwa', 'Chemistry Practical Exam Draft', 'Geography Lesson Plan: Climate Zones',
    'Physics Worksheet — Motion', 'Amharic Grammar Test', 'Civics Notes — Constitution',
  ];
  const statuses = [
    ...Array(5).fill('submitted'), ...Array(3).fill('needs_revision'),
    ...Array(4).fill('approved'),
  ];

  const rows = titles.map((title, i) => {
    const teacher = teachers[i % teachers.length];
    const status = statuses[i % statuses.length];
    const approved = status === 'approved';
    return {
      tenant_id: TENANT,
      teacher_id: teacher.id,
      type: types[i % types.length],
      title,
      class_id: ctx.classId,
      subject_id: ctx.subjectId,
      week_number: (i % 12) + 1,
      body: `Draft content for "${title}". Includes objectives, questions and marking guide.`,
      status,
      submitted_at: status === 'draft' ? null : daysAgo(10 - (i % 9)),
      reviewed_by: approved || status === 'needs_revision' ? ctx.reviewerId : null,
      reviewed_at: approved || status === 'needs_revision' ? daysAgo(2 - (i % 2)) : null,
      review_comment: status === 'needs_revision'
        ? 'Please revise Q4 and Q7 — clarity and difficulty balance.'
        : approved ? 'Well structured. Approved.' : null,
      rubric_scores: approved ? JSON.stringify({ alignment: 4 + (i % 2), difficulty: 4, clarity: 4 + ((i + 1) % 2), answer_key: 5 }) : '{}',
      is_banked: approved && i % 2 === 0,
      created_at: daysAgo(11 - (i % 10)),
    };
  });
  await knex('content_submissions').insert(rows);
  console.log('submissions:', rows.length);
}

async function seedKpis(teachers) {
  const existing = await knex('teacher_kpi_metrics').where('tenant_id', TENANT).count('* as c');
  if (Number(existing[0].c) > 0) return console.log('kpis: already seeded');
  const hr = await knex('users').where({ tenant_id: TENANT, role: 'hr' }).select('id').first();
  const periods = ['Q1 2026', 'Q2 2026'];
  const rows = [];
  for (const t of teachers.slice(0, 15)) {
    for (const period of periods) {
      const attendance = 88 + Math.random() * 11;
      const punctuality = 85 + Math.random() * 14;
      const feedback = 3.6 + Math.random() * 1.3;
      const syllabus = 75 + Math.random() * 24;
      const overall = ((attendance + punctuality) / 20 + feedback / 2 + syllabus / 50) / 2.6;
      rows.push({
        tenant_id: TENANT,
        teacher_id: t.id,
        period_name: period,
        attendance_rate: Number(attendance.toFixed(1)),
        punctuality_rate: Number(punctuality.toFixed(1)),
        substitutions_covered: Math.floor(Math.random() * 6),
        student_feedback_score: Number(feedback.toFixed(1)),
        syllabus_completion_rate: Number(syllabus.toFixed(1)),
        overall_rating: Number(Math.min(overall, 5).toFixed(2)),
        evaluated_by: hr?.id || null,
        comments: '',
      });
    }
  }
  await knex('teacher_kpi_metrics').insert(rows);
  console.log('kpis:', rows.length);
}

async function seedGuardShifts() {
  const existing = await knex('guard_shifts').where('tenant_id', TENANT).count('* as c');
  if (Number(existing[0].c) > 0) return console.log('guards: already seeded');
  const sc = await knex('users').where({ tenant_id: TENANT, role: 'shift_coordinator' }).select('id').first();
  const guards = await staffByRole('support', 8);
  if (!guards.length) return console.log('guards: no support staff found');
  const posts = ['Main Gate', 'KG Gate', 'Admin Block', 'Playground'];
  const rows = [];
  for (let d = -1; d <= 2; d++) {
    guards.forEach((g, i) => {
      const shiftType = i % 2 === 0 ? 'day' : 'night';
      rows.push({
        tenant_id: TENANT,
        guard_user_id: g.id,
        shift_date: dateStr(d),
        shift_type: shiftType,
        post_location: posts[i % posts.length],
        status: d <= 0 ? (d < 0 ? 'completed' : 'on_duty') : 'scheduled',
        assigned_by: sc?.id || null,
      });
    });
  }
  try {
    await knex('guard_shifts').insert(rows);
    console.log('guards:', rows.length);
  } catch (e) { console.log('guards skipped:', e.message.slice(0, 60)); }
}

async function seedVisitors() {
  const existing = await knex('visitor_logs').where('tenant_id', TENANT).count('* as c');
  if (Number(existing[0].c) > 0) return console.log('visitors: already seeded');
  const names = [
    ['Abebe Kebede', 'Parent of student Grade 5A', 'Parent meeting'],
    ['Sara Tesfaye', 'W/ro Almaz (HR)', 'Job interview'],
    ['Dr. Mengistu Ayele', 'School clinic', 'Health inspection'],
    ['Yohannes Girma', 'Principal office', 'Textbook supplier'],
    ['Marta Hailu', 'KG unit', 'Pick up child early'],
  ];
  const sec = await knex('users').where({ tenant_id: TENANT, role: 'security_head' }).select('id').first();
  const rows = names.map(([visitorName, person, purpose], i) => ({
    tenant_id: TENANT,
    visitor_name: visitorName,
    phone: '0911 00 00 ' + (10 + i),
    person_visited: person,
    purpose,
    badge_number: 'V-' + (100 + i),
    time_in: new Date(Date.now() - (300 - i * 40) * 60000),
    time_out: i < 3 ? new Date(Date.now() - (120 - i * 30) * 60000) : null,
    recorded_by: sec?.id || null,
  }));
  await knex('visitor_logs').insert(rows);
  console.log('visitors:', rows.length);
}

async function seedIncidents() {
  const existing = await knex('security_incidents').where('tenant_id', TENANT).count('* as c');
  if (Number(existing[0].c) > 0) return console.log('incidents: already seeded');
  const sec = await knex('users').where({ tenant_id: TENANT, role: 'security_head' }).select('id').first();
  const rows = [
    { title: 'Unidentified person at KG gate', severity: 'medium', location: 'KG Gate', description: 'Stranger attempted to enter without registration.', action_taken: 'Turned away and registered after ID check.', status: 'resolved' },
    { title: 'Broken fence section near playground', severity: 'low', location: 'Playground', description: 'Students could slip through the gap during break.', action_taken: 'Reported to General Services for repair.', status: 'open' },
    { title: 'Altercation between two students at dismissal', severity: 'high', location: 'Main Gate', description: 'Fight broke out while leaving; guards separated them.', action_taken: 'Students taken to VP discipline office; parents called.', status: 'open' },
  ];
  await knex('security_incidents').insert(rows.map((r) => ({ ...r, tenant_id: TENANT, reported_by: sec?.id || null })));
  console.log('incidents:', rows.length);
}

async function seedMaintenance() {
  const existing = await knex('maintenance_requests').where('tenant_id', TENANT).count('* as c');
  if (Number(existing[0].c) > 0) return console.log('maintenance: already seeded');
  const reporter = await knex('users').where({ tenant_id: TENANT, role: 'teacher' }).select('id').first();
  const rows = [
    { title: 'Leaking tap in Grade 4 washroom', location: 'Block B washroom', category: 'plumbing', description: 'Tap running continuously, wasting water.', estimated_cost: 350, status: 'open' },
    { title: 'Flickering lights in Lab 2', location: 'Science lab', category: 'electrical', description: 'Two tube lights flickering during experiments.', estimated_cost: 500, status: 'in_progress', assigned_to: 'Ato Tadesse (electrician)' },
    { title: 'Broken chairs in Grade 7B', location: 'Grade 7B classroom', category: 'furniture', description: 'Three chairs with broken legs.', estimated_cost: 900, actual_cost: 850, status: 'completed', completed_at: daysAgo(2) },
    { title: 'Cracked window KG classroom', location: 'KG 2', category: 'structural', description: 'Window glass cracked, needs replacement before rainy season.', estimated_cost: 700, status: 'open' },
  ];
  await knex('maintenance_requests').insert(rows.map((r) => ({ ...r, tenant_id: TENANT, reported_by: reporter?.id || null })));
  console.log('maintenance:', rows.length);
}

async function seedPurchases() {
  const existing = await knex('purchase_requests').where('tenant_id', TENANT).count('* as c');
  if (Number(existing[0].c) > 0) return console.log('purchases: already seeded');
  const gs = await knex('users').where({ tenant_id: TENANT, role: 'general_services' }).select('id').first();
  const admin = await knex('users').where({ tenant_id: TENANT, role: 'admin' }).select('id').first();
  const gm = await knex('users').where({ tenant_id: TENANT, role: 'general_manager' }).select('id').first();
  const rows = [
    { item_name: 'Chalk boxes', quantity: 100, estimated_cost: 2500, justification: 'Term 3 classroom supply.', status: 'approved', requested_by: gs?.id, approved_by: admin?.id, approved_at: daysAgo(3) },
    { item_name: 'Printing paper (rim)', quantity: 60, estimated_cost: 9000, justification: 'Exam printing.', status: 'approved', requested_by: gs?.id, approved_by: admin?.id, approved_at: daysAgo(5) },
    { item_name: 'Whiteboard markers carton', quantity: 24, estimated_cost: 4800, justification: 'Teacher stationery replenishment.', status: 'pending', requested_by: gs?.id },
    { item_name: 'Water dispenser for staff room', quantity: 2, estimated_cost: 14000, justification: 'Old units failed; high-value requisition needs GM approval.', status: 'pending', requested_by: gs?.id },
  ];
  await knex('purchase_requests').insert(rows.map((r) => ({ ...r, tenant_id: TENANT })));
  console.log('purchases:', rows.length);
}

(async () => {
  const teachers = await pickTeachers(16);
  if (!teachers.length) { console.error('No teachers found'); process.exit(1); }
  const ctx = await firstClassSubject();
  await seedSubmissions(teachers, ctx);
  await seedKpis(teachers);
  await seedGuardShifts();
  await seedVisitors();
  await seedIncidents();
  await seedMaintenance();
  await seedPurchases();
  console.log('SEED COMPLETE');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
