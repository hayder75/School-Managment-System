/**
 * Some legacy sheets ended up with the same column code twice (for example a
 * "test_1" in Continuous Assessment and another "test_1" in Tests). The UI
 * works, but saving the Columns dialog rejects duplicate codes. Give the
 * duplicates unique codes and move their exams with them.
 */

function parse(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}

exports.up = async function up(knex) {
  const sheets = await knex('mark_sheets').select('*');
  for (const sheet of sheets) {
    const config = parse(sheet.config);
    if (!config || !Array.isArray(config.groups)) continue;

    const used = new Set();
    const remapped = new Set();
    let changed = false;

    for (const group of config.groups) {
      for (const comp of group.components || []) {
        if (!used.has(comp.code)) {
          used.add(comp.code);
          continue;
        }
        const oldCode = comp.code;
        let n = 2;
        let newCode = `${oldCode}_${n}`;
        while (used.has(newCode)) { n += 1; newCode = `${oldCode}_${n}`; }
        used.add(newCode);
        comp.code = newCode;
        changed = true;

        // Move one matching exam (prefer the same group) to the new code.
        const exams = await knex('exams')
          .where({
            tenant_id: sheet.tenant_id,
            class_id: sheet.class_id,
            subject_id: sheet.subject_id,
            term_id: sheet.term_id,
            component_code: oldCode,
          })
          .whereNull('archived_at')
          .orderBy('sort_order')
          .orderBy('date');
        const exam = exams.find((e) => e.component_group === group.code && !remapped.has(e.id))
          || exams.find((e) => !remapped.has(e.id));
        if (exam) {
          await knex('exams').where({ id: exam.id }).update({ component_code: newCode });
          remapped.add(exam.id);
        }
      }
    }

    if (changed) {
      await knex('mark_sheets').where({ id: sheet.id }).update({
        config: JSON.stringify(config),
        updated_at: knex.fn.now(),
      });
    }
  }
};

exports.down = async function down() {
  // Data-only normalisation.
};
