// Seeds realistic report-card data for one class so the report card can be
// previewed. Idempotent: re-running adds nothing duplicate.
//
// Usage: node scripts/seed_report_card_demo.js ["Grade 1 A"] ["Semester 1"]
const db = require('../src/config/database');

const CLASS_NAME = process.argv[2] || 'Grade 1 A';
const TERM_NAME = process.argv[3] || 'Semester 1';
const TENANT = '00000000-0000-0000-0000-000000000001';

// deterministic pseudo-random 0..1 from a string
function rand(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}
const mark = (key, lo, hi) => Math.round(lo + rand(key) * (hi - lo));

const EXAMS = [
  { name: 'Classwork', type: 'classwork', lo: 65, hi: 100 },
  { name: 'Homework', type: 'homework', lo: 65, hi: 100 },
  { name: 'Quiz', type: 'quiz', lo: 55, hi: 100 },
  { name: 'Final Exam', type: 'final', lo: 50, hi: 100 },
];

function addDays(d, n) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
const iso = (d) => new Date(d).toISOString().slice(0, 10);

async function main() {
  const tenantId = TENANT;
  const cls = await db('classes').where({ tenant_id: tenantId }).whereRaw('lower(name)=lower(?)', [CLASS_NAME]).first();
  if (!cls) throw new Error(`Class not found: ${CLASS_NAME}`);
  const term = await db('terms').where({ tenant_id: tenantId }).whereRaw('lower(name)=lower(?)', [TERM_NAME]).first();
  if (!term) throw new Error(`Term not found: ${TERM_NAME}`);

  const students = await db('students').where({ tenant_id: tenantId, class_id: cls.id, status: 'active' })
    .select('id', 'user_id');
  console.log(`Class ${cls.name} · ${students.length} students`);

  const subjects = await db('teacher_subjects as ts').join('subjects as s', 's.id', 'ts.subject_id')
    .where({ 'ts.tenant_id': tenantId, 'ts.class_id': cls.id })
    .distinct('s.id', 's.name').orderBy('s.name');
  console.log(`Subjects: ${subjects.map((s) => s.name).join(', ')}`);

  // Assign a homeroom teacher if none, so the report card shows a Class Advisor.
  if (!cls.class_teacher_id) {
    const t = await db('teacher_subjects').where({ tenant_id: tenantId, class_id: cls.id }).select('teacher_id').first();
    if (t?.teacher_id) {
      await db('classes').where({ id: cls.id }).update({ class_teacher_id: t.teacher_id, updated_at: db.fn.now() });
      console.log('Assigned homeroom teacher for', cls.name);
    }
  }

  const termStart = new Date(term.start_date);
  const termEnd = new Date(term.end_date);

  let examCount = 0, gradeCount = 0;
  for (const subj of subjects) {
    for (const ex of EXAMS) {
      let exam = await db('exams').where({
        tenant_id: tenantId, class_id: cls.id, subject_id: subj.id, term_id: term.id, type: ex.type, name: ex.name,
      }).first();
      if (!exam) {
        [exam] = await db('exams').insert({
          tenant_id: tenantId, name: ex.name, type: ex.type, class_id: cls.id, subject_id: subj.id,
          term_id: term.id, date: iso(termStart), total_marks: 100, pass_marks: 50,
        }).returning('*');
        examCount++;
      }
      for (const st of students) {
        const m = mark(`${st.id}|${subj.id}|${ex.type}`, ex.lo, ex.hi);
        const letter = m >= 90 ? 'A' : m >= 80 ? 'B' : m >= 70 ? 'C' : m >= 60 ? 'D' : m >= 50 ? 'E' : 'F';
        await db('grades').insert({
          tenant_id: tenantId, student_id: st.user_id, exam_id: exam.id, marks_obtained: m, grade_letter: letter,
        }).onConflict(['student_id', 'exam_id']).merge(['marks_obtained', 'grade_letter', 'updated_at']);
        gradeCount++;
      }
    }
  }
  console.log(`Exams created: ${examCount} · grades upserted: ${gradeCount}`);

  // Attendance over the last 30 days (clamped to the term).
  const today = new Date();
  let from = new Date(Math.max(termStart.getTime(), addDays(today, -30).getTime()));
  let attCount = 0;
  for (const st of students) {
    for (let d = new Date(from); d <= today && d <= termEnd; d = addDays(d, 1)) {
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      const r = rand(`${st.id}|att|${iso(d)}`);
      const status = r < 0.05 ? 'absent' : r < 0.09 ? 'late' : 'present';
      await db('attendance').insert({
        tenant_id: tenantId, student_id: st.user_id, class_id: cls.id, date: iso(d), status,
      }).onConflict(['student_id', 'class_id', 'date']).ignore();
      attCount++;
    }
  }
  console.log(`Attendance rows considered: ${attCount}`);

  console.log('\nDone. Open Report Cards → class "%s" → term "%s" → Load.', cls.name, term.name);
  await db.destroy();
}

main().catch((e) => { console.error('SEED ERROR:', e.message); process.exit(1); });
