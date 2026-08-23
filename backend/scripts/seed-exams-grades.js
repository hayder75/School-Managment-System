/* Seeds a full term of exams + grades across classes/subjects so semester
   results and report cards have real data. Safe to re-run (skips if exams exist for Term 1). */
const knex = require('../src/config/database');
const TENANT = '00000000-0000-0000-0000-000000000001';

async function up() {
  const term = await knex('terms').where('tenant_id', TENANT).orderBy('start_date').first();
  if (!term) return console.log('no terms found — run terms setup first');

  const existingExams = await knex('exams').where({ tenant_id: TENANT, term_id: term.id }).count('* as c');
  if (Number(existingExams[0].c) > 0) return console.log(`exams already seeded for ${term.name}`);

  const classes = await knex('classes').where('tenant_id', TENANT).select('id', 'name', 'grade_level').limit(6);
  const subjects = await knex('subjects').where('tenant_id', TENANT).select('id', 'name').limit(8);
  if (!classes.length || !subjects.length) return console.log('need classes and subjects first');

  // Two CA tests + one final per subject
  const teacher = await knex('users').where({ tenant_id: TENANT, role: 'teacher', status: 'active' }).select('id').first();
  const admin = await knex('users').where({ tenant_id: TENANT, role: 'admin' }).select('id').first();

  let examCount = 0;
  const examIdsBySubjectClass = [];

  for (const cls of classes) {
    for (const sub of subjects) {
      const defs = [
        { name: `${sub.name} Test 1`, type: 'test', total: 20, dateOffset: 14 },
        { name: `${sub.name} Quiz & Assignment`, type: 'quiz', total: 30, dateOffset: 35 },
        { name: `${sub.name} Semester Exam`, type: 'exam', total: 50, dateOffset: 60 },
      ];
      for (const def of defs) {
        const [exam] = await knex('exams')
          .insert({
            tenant_id: TENANT,
            name: `${def.name} — ${cls.name}`,
            class_id: cls.id,
            subject_id: sub.id,
            term_id: term.id,
            type: def.type,
            total_marks: def.total,
            pass_marks: Math.round(def.total * 0.5),
            date: new Date(Date.now() - def.dateOffset * 86400000).toISOString().slice(0, 10),
            description: `Seeded assessment for ${cls.name}`,
          })
          .returning('*');
        examIdsBySubjectClass.push({ exam, classId: cls.id, subjectId: sub.id });
        examCount += 1;
      }
    }
  }

  console.log('exams created:', examCount);

  // Grades: every active student in those classes
  const students = await knex('students as s')
    .join('users as u', 's.user_id', 'u.id')
    .whereIn('s.class_id', classes.map((c) => c.id))
    .where('s.tenant_id', TENANT)
    .where('s.status', 'active')
    .select('u.id as user_id', 's.class_id');

  console.log('students to grade:', students.length);

  const rows = [];
  for (const { exam, classId } of examIdsBySubjectClass) {
    const classStudents = students.filter((s) => s.class_id === classId);
    for (const st of classStudents) {
      // deterministic pseudo-random performance 40-98%
      const seedNum = (st.user_id.charCodeAt(0) + exam.id.length * 7 + Number(exam.total_marks)) % 59;
      const pct = 40 + (seedNum % 59);
      const marks = Math.min(Number(exam.total_marks), Math.max(0, Math.round((pct / 100) * Number(exam.total_marks))));
      rows.push({
        tenant_id: TENANT,
        student_id: st.user_id,
        exam_id: exam.id,
        marks_obtained: marks,
      });
    }
    // insert in chunks
    if (rows.length >= 1000) {
      await knex('grades').insert(rows.splice(0));
    }
  }
  if (rows.length) await knex('grades').insert(rows);

  console.log('SEED COMPLETE — grades inserted for', students.length, 'students across', examCount, 'exams');
}

up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
