/**
 * Map legacy reading/writing/speaking exams onto the template skill columns.
 *
 * Teachers previously entered skills as separate exams called "Skill",
 * "Writing skill", "Reding skill 1", etc. When the subject has a language
 * skill group, move those exams into the matching Listening/Reading/Writing/
 * Speaking component instead of leaving an extra "Skill" column.
 */

function parse(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}

function targetFor(exam) {
  const name = String(exam.name || '').toLowerCase();
  const type = String(exam.type || '').toLowerCase();
  if (type === 'reading_skill' || name.includes('read')) return 'reading';
  if (type === 'writing_skil' || name.includes('writ') || name.includes('skill')) return 'writing';
  if (name.includes('listen')) return 'listening';
  if (name.includes('speak')) return 'speaking';
  return null;
}

const SKILL_CODES = ['listening', 'reading', 'writing', 'speaking'];

exports.up = async function up(knex) {
  const sheets = await knex('mark_sheets').select('*');
  for (const sheet of sheets) {
    const config = parse(sheet.config);
    if (!config || !Array.isArray(config.groups)) continue;
    const skillGroup = config.groups.find((g) => g.code === 'skill');
    if (!skillGroup) continue;

    const exams = await knex('exams')
      .where({
        tenant_id: sheet.tenant_id,
        class_id: sheet.class_id,
        subject_id: sheet.subject_id,
        term_id: sheet.term_id,
      })
      .whereNull('archived_at');
    if (!exams.length) continue;

    let changed = false;
    for (const exam of exams) {
      const target = targetFor(exam);
      if (!target) continue;
      let comp = (skillGroup.components || []).find((c) => c.code === target);
      if (!comp) {
        comp = { code: target, name: target.charAt(0).toUpperCase() + target.slice(1), max_marks: Number(exam.total_marks || 100), input_type: 'number' };
        skillGroup.components = [...(skillGroup.components || []), comp];
        changed = true;
      }
      await knex('exams').where({ id: exam.id }).update({
        component_code: target,
        component_group: 'skill',
        weight_pct: Number(skillGroup.weight_pct || 0),
        is_sheet_component: true,
        input_type: 'number',
      });
      changed = true;
    }

    if (!changed) continue;

    // Drop any non-standard skill column that no longer has an exam.
    const used = new Set(
      (await knex('exams')
        .where({
          tenant_id: sheet.tenant_id,
          class_id: sheet.class_id,
          subject_id: sheet.subject_id,
          term_id: sheet.term_id,
        })
        .whereNull('archived_at')
        .select('component_code')).map((e) => e.component_code)
    );
    skillGroup.components = (skillGroup.components || []).filter((c) => (
      SKILL_CODES.includes(c.code) || used.has(c.code)
    ));

    await knex('mark_sheets').where({ id: sheet.id }).update({
      config: JSON.stringify(config),
      updated_at: knex.fn.now(),
    });
  }
};

exports.down = async function down() {
  // Data-only normalisation.
};
