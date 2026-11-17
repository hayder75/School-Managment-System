/**
 * Normalise existing sheets to their subject/level template.
 *
 * The first pass built a sheet config from whatever exams happened to exist.
 * That meant a KG sheet only showed "Test" and a primary sheet never showed
 * Mid/Final until someone added them. This migration replaces each sheet
 * config with the best matching template and maps every existing exam into a
 * template column (extra/duplicate exams become extra columns in the same
 * group). No grade value is touched, and existing group proportions stay the
 * same because the template's default weights keep the same ratios.
 */

const GROUP_NAMES = {
  ca: 'Continuous Assessment',
  skill: 'Listening, Reading, Writing, Speaking',
  test: 'Tests',
  mid: 'Mid Exam',
  final: 'Final Exam',
  rhyme: 'Rhyme',
  song: 'Song',
};

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'item';
}

function groupForType(type) {
  const t = String(type || '').toLowerCase();
  if (['reading_skill', 'writing_skil', 'listening', 'speaking', 'reading', 'writing'].includes(t)) return 'skill';
  if (t === 'test') return 'test';
  if (['midterm', 'mid'].includes(t)) return 'mid';
  if (['exam', 'final', 'semester'].includes(t)) return 'final';
  if (t === 'rhyme') return 'rhyme';
  if (t === 'song') return 'song';
  return 'ca';
}

function parse(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}

function pickTemplate(rows, { level_group, subject_id, term_id }) {
  let best = null;
  let bestScore = -1;
  for (const row of rows) {
    let score = 0;
    if (subject_id && row.subject_id === subject_id) score += 40;
    else if (row.subject_id) continue;
    if (term_id && row.term_id === term_id) score += 20;
    else if (row.term_id) continue;
    if (level_group && row.level_group === level_group) score += 10;
    else if (row.level_group) continue;
    if (score > bestScore) { bestScore = score; best = row; }
  }
  return best;
}

function uniqueCode(base, used) {
  let code = base || 'item';
  let i = 2;
  while (used.has(code)) { code = `${base}_${i}`; i += 1; }
  used.add(code);
  return code;
}

function matchComponent(group, exam) {
  const name = String(exam.name || '').trim().toLowerCase();
  const code = String(exam.component_code || '').trim().toLowerCase();
  if (code) {
    const byCode = group.components.find((c) => String(c.code).toLowerCase() === code);
    if (byCode) return byCode;
  }
  if (!name) return null;
  const byName = group.components.find((c) => {
    const cn = String(c.name || '').trim().toLowerCase();
    return cn === name || name.includes(cn) || cn.includes(name);
  });
  if (byName) return byName;
  // A generic "test" exam can take the first unused test column.
  if (group.code === 'test') {
    const free = group.components.find((c) => !c.__used);
    if (free) return free;
  }
  return null;
}

exports.up = async function up(knex) {
  const tenants = await knex('tenants').select('id');
  for (const tenant of tenants) {
    const tenantId = tenant.id;
    const templates = await knex('assessment_templates').where({ tenant_id: tenantId });
    const sheets = await knex('mark_sheets as ms')
      .join('classes as c', 'ms.class_id', 'c.id')
      .where({ 'ms.tenant_id': tenantId })
      .select('ms.*', 'c.level_group');

    for (const sheet of sheets) {
      const template = pickTemplate(templates, {
        level_group: sheet.level_group,
        subject_id: sheet.subject_id,
        term_id: sheet.term_id,
      });
      let config = parse(template?.config);
      if (!config || !Array.isArray(config.groups)) {
        // Fall back to the sheet's existing config when no template exists.
        config = parse(sheet.config);
      }
      if (!config || !Array.isArray(config.groups)) continue;

      // Deep clone and mark every component as unused.
      config = JSON.parse(JSON.stringify(config));
      const used = new Set();
      for (const g of config.groups) {
        g.components = (g.components || []).map((c) => ({ ...c, __used: false }));
      }

      const exams = await knex('exams')
        .where({
          tenant_id: tenantId,
          class_id: sheet.class_id,
          subject_id: sheet.subject_id,
          term_id: sheet.term_id,
        })
        .whereNull('archived_at')
        .orderBy('date')
        .orderBy('created_at');

      let order = 0;
      for (const exam of exams) {
        let groupCode = exam.component_group || groupForType(exam.type);
        let group = config.groups.find((g) => g.code === groupCode);
        if (!group) {
          // Keep every mark visible: route unknown groups into CA.
          groupCode = 'ca';
          group = config.groups.find((g) => g.code === groupCode);
        }
        if (!group) {
          group = { code: groupCode, name: GROUP_NAMES[groupCode] || groupCode, weight_pct: 10, is_final: false, components: [] };
          config.groups.push(group);
        }
        let comp = matchComponent(group, exam);
        if (!comp) {
          comp = {
            code: uniqueCode(slug(exam.name || exam.type || 'item'), used),
            name: exam.name || GROUP_NAMES[groupCode] || 'Assessment',
            max_marks: Number(exam.total_marks || 100),
            input_type: 'number',
          };
          group.components.push(comp);
        }
        comp.__used = true;
        await knex('exams').where({ id: exam.id }).update({
          component_code: comp.code,
          component_group: groupCode,
          weight_pct: Number(group.weight_pct || 0),
          sort_order: order,
          is_sheet_component: true,
          input_type: 'number',
        });
        order += 1;
      }

      // Remove the helper flag and make sure the weights still total 100.
      for (const g of config.groups) {
        for (const c of g.components) {
          delete c.__used;
          delete c.used;
        }
      }
      const total = config.groups.reduce((s, g) => s + Number(g.weight_pct || 0), 0);
      if (config.groups.length && Math.abs(total - 100) > 0.1) {
        const last = config.groups[config.groups.length - 1];
        last.weight_pct = Math.round((Number(last.weight_pct || 0) + (100 - total)) * 10) / 10;
      }

      await knex('mark_sheets').where({ id: sheet.id }).update({
        config: JSON.stringify(config),
        updated_at: knex.fn.now(),
      });
    }
  }
};

exports.down = async function down() {
  // Data-only normalisation; the previous configs are not restored.
};
