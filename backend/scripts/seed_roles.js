#!/usr/bin/env node
// Seed the permission catalog + built-in roles for the tenant (idempotent).
const knex = require('knex')(require('../src/database/knexfile').development);
const { seedTenant } = require('../src/modules/roles/roles.seed');

(async () => {
  const tenants = await knex('tenants').select('id', 'name');
  for (const t of tenants) {
    await seedTenant(knex, t.id);
    console.log(`seeded roles/permissions for tenant ${t.name || t.id}`);
  }
  const p = await knex('permissions').count('* as c').first();
  const r = await knex('roles').count('* as c').first();
  const rp = await knex('role_permissions').count('* as c').first();
  console.log(`permissions=${p.c} roles=${r.c} role_permissions=${rp.c}`);
  await knex.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
