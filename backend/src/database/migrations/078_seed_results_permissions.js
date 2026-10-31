// Re-seed the permission catalog so tenants pick up the new result-approval
// permissions without manually running scripts/seed_roles.js.
const { seedTenant } = require('../../modules/roles/roles.seed');

exports.up = async function up(knex) {
  const tenants = await knex('tenants').select('id');
  for (const t of tenants) {
    await seedTenant(knex, t.id);
  }
};

exports.down = async function down() {
  // Permissions are additive; nothing to roll back safely.
};
