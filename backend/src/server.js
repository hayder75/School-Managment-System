const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const { setupSocket } = require('./socket');
const { calculateLateFees } = require('./jobs/late-fee');

// Run periodic jobs on exactly one worker. pm2 sets NODE_APP_INSTANCE for each
// cluster worker (0-based); in fork mode it is undefined.
const isJobWorker = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';

async function start() {
  const server = http.createServer(app);
  await setupSocket(server);

  server.listen(config.port, () => {
    logger.info(`SMS API running on port ${config.port} (pid ${process.pid})`);
  });

  if (!isJobWorker) return;

  // Apply late fees periodically (runs once shortly after boot, then every 6h).
  async function runLateFees() {
    try {
      const res = await calculateLateFees();
      if (res && res.processed) logger.info(`Late-fee job processed ${res.processed} payment(s)`);
    } catch (err) {
      logger.error('Late-fee job failed', { error: err.message });
    }
  }

  setTimeout(runLateFees, 30 * 1000);
  setInterval(runLateFees, 6 * 60 * 60 * 1000);
}

start().catch((err) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});
