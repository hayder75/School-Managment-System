const knex = require('knex');
const config = require('./index');

const db = knex({
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
  },
  pool: {
    min: 1,
    // Kept modest so `pm2 -i max` workers don't exhaust Postgres connections.
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  },
});

module.exports = db;
