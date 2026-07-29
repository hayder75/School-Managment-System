const db = require('../../config/database');

async function get(tenantId) {
  const rows = await db('settings').where({ tenant_id: tenantId }).select('key', 'value');
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

async function getByKey(tenantId, key) {
  const row = await db('settings').where({ tenant_id: tenantId, key }).first();
  return row?.value || null;
}

async function set(tenantId, key, value) {
  await db('settings')
    .insert({ tenant_id: tenantId, key, value: JSON.stringify(value) })
    .onConflict(['tenant_id', 'key'])
    .merge();
}

async function setMany(tenantId, data) {
  for (const [key, value] of Object.entries(data)) {
    await set(tenantId, key, value);
  }
}

async function remove(tenantId, key) {
  return db('settings').where({ tenant_id: tenantId, key }).del();
}

module.exports = { get, getByKey, set, setMany, remove };
