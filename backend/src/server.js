const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const { setupSocket } = require('./socket');

const server = http.createServer(app);
setupSocket(server);

server.listen(config.port, () => {
  logger.info(`SMS API running on port ${config.port}`);
});
