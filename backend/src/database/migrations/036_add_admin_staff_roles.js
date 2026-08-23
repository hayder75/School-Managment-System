const { seedTenant } = require('../../modules/roles/roles.seed');

exports.up = async function up(knex) {
  const tenants = await knex('tenants').select('id');
  for (const t of tenants) {
    await seedTenant(knex, t.id);
  }
};

exports.down = async function down() {
  // no-op: built-in roles are harmless if left in place
};
