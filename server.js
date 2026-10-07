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
      logger.error('Não foi possível conectar ao MySQL. Verifique o .env ou use DATA_DRIVER=sqlite.', err);
      process.exit(1);
    }
  }

  if (repositories.driver === 'sqlite') {
    // Abre (e, na primeira vez, cria e popula) o banco interno antes de aceitar requisições.
    require('./src/db/sqlite').getDb();
    logger.info(`Banco interno: ${config.dataFile}`);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`Lenom.AI rodando em ${config.appUrl} (${config.env}) — dados: ${repositories.driver}`);
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
