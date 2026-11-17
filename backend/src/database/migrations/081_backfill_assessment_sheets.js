/**
 * Backfill assessment sheets for the marks that already exist.
 *
 * Nothing is rewritten: every exam becomes one column on its class+subject+
 * term sheet, every grade keeps its value, and component metadata is derived
 * from the exam type. Templates are seeded for primary, KG and Nursery.
 */

const LANGUAGE_SUBJECTS = ['Amharic', 'English', 'Sidamu Afo'];

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'item';
}

function groupFor(type) {
  const t = String(type || '').toLowerCase();
  if (['reading_skill', 'writing_skil', 'listening', 'speaking', 'reading', 'writing'].includes(t)) return 'skill';
  if (['test'].includes(t)) return 'test';
  if (['midterm', 'mid'].includes(t)) return 'mid';
  if (['exam', 'final', 'semester'].includes(t)) return 'final';
  return 'ca';
}

const GROUP_NAMES = {
  ca: 'Continuous Assessment',
  skill: 'Listening, Reading, Writing, Speaking',
  test: 'Tests',
  mid: 'Mid Exam',
  final: 'Final Exam',
};

const BASE_WEIGHTS = { ca: 20, skill: 20, test: 10, mid: 20, final: 30 };

function buildConfig(exams) {
  const groups = new Map();
  let order = 0;
  for (const e of exams) {
    const g = groupFor(e.type);
    if (!groups.has(g)) {
      groups.set(g, { code: g, name: GROUP_NAMES[g] || g, weight_pct: 0, is_final: g === 'final', components: [] });
    }
    const code = `${slug(e.type || 'item')}_${order + 1}`;
    groups.get(g).components.push({
      code,
      name: e.name || GROUP_NAMES[g] || 'Assessment',
      max_marks: Number(e.total_marks || 100),
      input_type: 'number',
      exam_id: e.id,
    });
    order += 1;
  }

  const present = [...groups.keys()];
  const rawTotal = present.reduce((s, g) => s + (BASE_WEIGHTS[g] || 10), 0) || 1;
  for (const g of present) {
    groups.get(g).weight_pct = Math.round(((BASE_WEIGHTS[g] || 10) / rawTotal) * 1000) / 10;
  }
  // Force an exact 100 on the last group after rounding.
  if (present.length) {
    const total = present.reduce((s, g) => s + groups.get(g).weight_pct, 0);
    const last = groups.get(present[present.length - 1]);
    last.weight_pct = Math.round((last.weight_pct + (100 - total)) * 10) / 10;
  }

  return { mode: 'weighted', pass_pct: 50, groups: [...groups.values()] };
}

function primaryDefaultConfig() {
  return {
    mode: 'weighted',
    pass_pct: 50,
    groups: [
      { code: 'ca', name: 'Continuous Assessment', weight_pct: 20, is_final: false, components: [
        { code: 'homework', name: 'Homework', max_marks: 10, input_type: 'number' },
        { code: 'classwork', name: 'Class work', max_marks: 10, input_type: 'number' },
        { code: 'assignment', name: 'Assignment', max_marks: 10, input_type: 'number' },
        { code: 'worksheet', name: 'Worksheet', max_marks: 10, input_type: 'number' },
        { code: 'quiz', name: 'Quiz', max_marks: 10, input_type: 'number' },
      ] },
      { code: 'test', name: 'Tests', weight_pct: 10, is_final: false, components: [
        { code: 'test_1', name: 'Test 1', max_marks: 20, input_type: 'number' },
        { code: 'test_2', name: 'Test 2', max_marks: 20, input_type: 'number' },
      ] },
      { code: 'mid', name: 'Mid Exam', weight_pct: 20, is_final: false, components: [
        { code: 'mid', name: 'Mid Exam', max_marks: 50, input_type: 'number' },
      ] },
      { code: 'final', name: 'Final Exam', weight_pct: 50, is_final: true, components: [
        { code: 'final', name: 'Final Exam', max_marks: 100, input_type: 'number' },
      ] },
    ],
  };
}

function languageConfig() {
  return {
    mode: 'weighted',
    pass_pct: 50,
    groups: [
      { code: 'ca', name: 'Continuous Assessment', weight_pct: 20, is_final: false, components: [
        { code: 'homework', name: 'Homework', max_marks: 10, input_type: 'number' },
        { code: 'classwork', name: 'Class work', max_marks: 10, input_type: 'number' },
        { code: 'assignment', name: 'Assignment', max_marks: 10, input_type: 'number' },
        { code: 'worksheet', name: 'Worksheet', max_marks: 10, input_type: 'number' },
        { code: 'quiz', name: 'Quiz', max_marks: 10, input_type: 'number' },
      ] },
      { code: 'skill', name: 'Listening, Reading, Writing, Speaking', weight_pct: 20, is_final: false, components: [
        { code: 'listening', name: 'Listening', max_marks: 10, input_type: 'number' },
        { code: 'reading', name: 'Reading', max_marks: 10, input_type: 'number' },
        { code: 'writing', name: 'Writing', max_marks: 10, input_type: 'number' },
        { code: 'speaking', name: 'Speaking', max_marks: 10, input_type: 'number' },
      ] },
      { code: 'test', name: 'Tests', weight_pct: 10, is_final: false, components: [
        { code: 'test_1', name: 'Test 1', max_marks: 20, input_type: 'number' },
        { code: 'test_2', name: 'Test 2', max_marks: 20, input_type: 'number' },
      ] },
      { code: 'mid', name: 'Mid Exam', weight_pct: 20, is_final: false, components: [
        { code: 'mid', name: 'Mid Exam', max_marks: 50, input_type: 'number' },
      ] },
      { code: 'final', name: 'Final Exam', weight_pct: 30, is_final: true, components: [
        { code: 'final', name: 'Final Exam', max_marks: 100, input_type: 'number' },
      ] },
    ],
  };
}

function kindergartenConfig() {
  return {
    mode: 'weighted',
    pass_pct: 50,
    groups: [
      { code: 'test', name: 'Test', weight_pct: 20, is_final: false, components: [
        { code: 'test', name: 'Test', max_marks: 100, input_type: 'number' },
      ] },
      { code: 'mid', name: 'Mid', weight_pct: 30, is_final: false, components: [
        { code: 'mid', name: 'Mid', max_marks: 100, input_type: 'number' },
      ] },
      { code: 'rhyme', name: 'Rhyme', weight_pct: 25, is_final: false, components: [
        { code: 'rhyme', name: 'Rhyme', max_marks: 100, input_type: 'number' },
      ] },
      { code: 'song', name: 'Song', weight_pct: 25, is_final: false, components: [
        { code: 'song', name: 'Song', max_marks: 100, input_type: 'number' },
      ] },
    ],
  };
}

async function ensureTemplate(knex, tenantId, { level_group = null, subject_id = null, term_id = null, name, config, is_default = false }) {
  const existing = await knex('assessment_templates')
    .where({ tenant_id: tenantId, name })
    .modify((q) => {
      if (level_group) q.where('level_group', level_group); else q.whereNull('level_group');
      if (subject_id) q.where('subject_id', subject_id); else q.whereNull('subject_id');
      if (term_id) q.where('term_id', term_id); else q.whereNull('term_id');
    })
    .first();
  if (existing) return existing.id;
  const [row] = await knex('assessment_templates')
    .insert({
      tenant_id: tenantId,
      level_group,
      subject_id,
      term_id,
      name,
      config: JSON.stringify(config),
      is_default,
    })
    .returning('*');
  return row.id;
}

exports.up = async function up(knex) {
  const tenants = await knex('tenants').select('id');
  for (const tenant of tenants) {
    const tenantId = tenant.id;

    // 1. Every exam must belong to the term that covers its date.
    const terms = await knex('terms')
      .where({ tenant_id: tenantId })
      .orderBy('start_date');
    const examsWithNoTerm = await knex('exams')
      .where({ tenant_id: tenantId })
      .whereNull('term_id')
      .select('id', 'date', 'created_at');
    for (const e of examsWithNoTerm) {
      const d = e.date || (e.created_at ? String(e.created_at).slice(0, 10) : null);
      const match = terms.find((t) => d && d >= String(t.start_date) && d <= String(t.end_date)) || terms[0];
      if (match) await knex('exams').where({ id: e.id }).update({ term_id: match.id });
    }

    // 2. Templates.
    await ensureTemplate(knex, tenantId, { level_group: null, name: 'School default', config: primaryDefaultConfig(), is_default: true });
    await ensureTemplate(knex, tenantId, { level_group: 'primary', name: 'Primary default', config: primaryDefaultConfig(), is_default: true });
    await ensureTemplate(knex, tenantId, { level_group: 'kg', name: 'Kindergarten', config: kindergartenConfig(), is_default: true });
    await ensureTemplate(knex, tenantId, { level_group: 'nursery', name: 'Nursery', config: kindergartenConfig(), is_default: true });

    const languageSubjects = await knex('subjects')
      .where({ tenant_id: tenantId })
      .whereIn('name', LANGUAGE_SUBJECTS)
      .select('id', 'name');
    for (const s of languageSubjects) {
      await knex('subjects').where({ id: s.id }).update({ has_language_skills: true });
      await ensureTemplate(knex, tenantId, {
        level_group: 'primary',
        subject_id: s.id,
        name: `${s.name} (language)`,
        config: languageConfig(),
        is_default: false,
      });
    }

    // 3. One sheet per existing class + subject + term that already has exams.
    const groups = await knex('exams')
      .where({ tenant_id: tenantId })
      .whereNotNull('class_id')
      .whereNotNull('subject_id')
      .whereNotNull('term_id')
      .whereNull('archived_at')
      .select('class_id', 'subject_id', 'term_id')
      .groupBy('class_id', 'subject_id', 'term_id');

    for (const g of groups) {
      const exams = await knex('exams')
        .where({
          tenant_id: tenantId,
          class_id: g.class_id,
          subject_id: g.subject_id,
          term_id: g.term_id,
        })
        .whereNull('archived_at')
        .orderBy('date')
        .orderBy('created_at');
      if (!exams.length) continue;

      const config = buildConfig(exams);
      const existing = await knex('mark_sheets')
        .where({ tenant_id: tenantId, class_id: g.class_id, subject_id: g.subject_id, term_id: g.term_id })
        .first();
      let sheetId = existing?.id;
      if (!sheetId) {
        const [row] = await knex('mark_sheets')
          .insert({
            tenant_id: tenantId,
            class_id: g.class_id,
            subject_id: g.subject_id,
            term_id: g.term_id,
            config: JSON.stringify(config),
            status: 'draft',
            pass_pct: 50,
          })
          .returning('*');
        sheetId = row.id;
      }

      // Write the component metadata onto every existing exam so the grid can
      // reconstruct the sheet even if the config is edited later.
      const flat = [];
      for (const grp of config.groups) {
        for (const c of grp.components) {
          flat.push({ ...c, group: grp.code, weight: grp.weight_pct });
        }
      }
      for (let i = 0; i < exams.length; i += 1) {
        const e = exams[i];
        const c = flat[i];
        await knex('exams').where({ id: e.id }).update({
          mark_sheet_id: sheetId,
          component_code: c?.code || `item_${i + 1}`,
          component_group: c?.group || groupFor(e.type),
          weight_pct: c?.weight ?? 0,
          sort_order: i,
          is_sheet_component: true,
          input_type: 'number',
        });
      }
    }
  }
};

exports.down = async function down(knex) {
  await knex('exams').update({
    mark_sheet_id: null,
    component_code: null,
    component_group: null,
    weight_pct: null,
    sort_order: 0,
    is_sheet_component: false,
    input_type: 'number',
  });
  await knex('mark_sheets').del();
  await knex('assessment_templates').del();
};
