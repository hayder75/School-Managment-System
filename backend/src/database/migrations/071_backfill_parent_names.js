// Backfill display names for parent accounts.
//
// Parents were imported with only a phone number and no name, so every screen
// that shows a person (chat, avatars, headers) rendered an empty/"?" label.
// Derive a name from the parent's linked student, using the same convention as
// the parents list: the child's middle name (or first name) as the given name,
// and the child's last name as the family name. Only rows that currently have
// no name at all are touched, so a real name is never overwritten.

exports.up = async function (knex) {
  const hasMiddle = await knex.schema.hasColumn('users', 'middle_name');
  const givenExpr = hasMiddle
    ? "COALESCE(NULLIF(BTRIM(cu.middle_name), ''), NULLIF(BTRIM(cu.first_name), ''))"
    : "NULLIF(BTRIM(cu.first_name), '')";

  await knex.raw(`
    UPDATE users p
    SET first_name = COALESCE(NULLIF(BTRIM(p.first_name), ''), c.given, ''),
        last_name  = COALESCE(NULLIF(BTRIM(p.last_name), ''),  c.family, ''),
        updated_at = NOW()
    FROM (
      SELECT DISTINCT ON (sp.parent_id)
        sp.parent_id,
        ${givenExpr} AS given,
        NULLIF(BTRIM(cu.last_name), '') AS family
      FROM student_parents sp
      JOIN students st ON st.id = sp.student_id
      JOIN users cu ON cu.id = st.user_id
      WHERE sp.parent_id IS NOT NULL
      ORDER BY sp.parent_id, sp.is_primary DESC NULLS LAST, st.created_at NULLS LAST, st.id
    ) c
    WHERE p.id = c.parent_id
      AND p.role = 'parent'
      AND NULLIF(BTRIM(p.first_name), '') IS NULL
      AND NULLIF(BTRIM(p.last_name), '') IS NULL
      AND (c.given IS NOT NULL OR c.family IS NOT NULL);
  `);
};

// Data backfill only — nothing to roll back safely.
exports.down = async function () {};