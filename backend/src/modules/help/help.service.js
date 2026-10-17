const { DOC, ROLE_LABELS } = require('../../content/manual.content');

// Public help content. Read-only, no live school data — safe to expose
// without authentication so the manual can be read before signing in.
function getManual() {
  return {
    title: 'School Management System',
    subtitle: 'User Manual',
    provider: 'EnglesTech Plc',
    parts: DOC.map((part) => ({
      part: part.part,
      short: part.short,
      chapters: part.chapters.map((ch) => ({
        title: ch.title,
        slug: ch.slug,
        roles: ch.roles,
        blocks: ch.blocks,
      })),
    })),
    roleLabels: ROLE_LABELS,
  };
}

module.exports = { getManual };