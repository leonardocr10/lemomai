const path = require('node:path');
const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const config = require('./config');
const { securityHeaders } = require('./middlewares/security');
const { issueCsrfToken } = require('./middlewares/csrf');
const { globalLocals, renderPage } = require('./middlewares/locals');
const { notFound, errorHandler } = require('./middlewares/error-handler');
const webRoutes = require('./routes/web.routes');
const apiRoutes = require('./routes/api.routes');

const ROOT = path.resolve(__dirname, '..');
const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;

function createApp() {
  const app = express();

  app.set('views', path.join(ROOT, 'views'));
  app.set('view engine', 'ejs');
  app.set('view cache', config.isProduction);
  app.set('trust proxy', config.trustProxy ? 1 : false);
  app.disable('x-powered-by');

  app.use(securityHeaders);
  app.use(compression());
  app.use(morgan(config.isProduction ? 'combined' : 'dev', {
    skip: (req) => !config.isProduction && /\.(css|js|png|jpe?g|webp|avif|svg|ico|woff2?)$/.test(req.path),
  }));

  // Arquivos estáticos: build com hash = cache imutável; demais = cache curto
  // (os links usam ?v=versão, então uma nova versão invalida o cache).
  app.use('/dist', express.static(path.join(ROOT, 'public', 'dist'), { maxAge: ONE_YEAR, immutable: true }));
  app.use(express.static(path.join(ROOT, 'public'), {
    maxAge: config.isProduction ? '7d' : 0,
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}uploads${path.sep}`)) res.set('X-Content-Type-Options', 'nosniff');
    },
  }));
  app.get('/favicon.ico', (req, res) => res.redirect(301, '/favicon-32.png'));

  app.use(cookieParser(config.cookieSecret));
  app.use(issueCsrfToken);
  app.use(renderPage);

  app.use('/api', apiRoutes);
  app.use(globalLocals);
  app.use('/', webRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
