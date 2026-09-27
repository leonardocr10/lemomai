const createApp = require('./src/app');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const repositories = require('./src/repositories');
const { getSequelize, closeDatabase } = require('./src/models');

async function start() {
  if (repositories.driver === 'mysql') {
    try {
      await getSequelize().authenticate();
      logger.info(`MySQL conectado (${config.db.host}:${config.db.port}/${config.db.name})`);
    } catch (err) {
      logger.error('Não foi possível conectar ao MySQL. Verifique o .env ou use USE_MOCK_DATA=true.', err);
      process.exit(1);
    }
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`LC Serviços rodando em ${config.appUrl} (${config.env}) — dados: ${repositories.driver}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} recebido, encerrando...`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', reason));

start();
