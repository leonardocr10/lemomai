/**
 * 404 e tratamento central de erros (HTML para páginas, JSON para /api).
 */
const HttpError = require('../utils/http-error');
const logger = require('../utils/logger');
const config = require('../config');

const wantsJson = (req) => req.originalUrl.startsWith('/api/') || req.xhr || req.accepts(['html', 'json']) === 'json';

function notFound(req, res, next) {
  next(HttpError.notFound());
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${status}`, err);
  } else if (status !== 404) {
    logger.warn(`${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
  }

  if (res.headersSent) return;

  const publicMessage = status >= 500 ? 'Ocorreu um erro inesperado. Tente novamente em instantes.' : err.message;

  if (wantsJson(req)) {
    return res.status(status).json({
      ok: false,
      message: publicMessage,
      ...(err.errors ? { errors: err.errors } : {}),
      ...(!config.isProduction && status >= 500 ? { stack: err.stack } : {}),
    });
  }

  const view = status === 404 ? 'errors/404' : status >= 500 ? 'errors/500' : 'errors/error';
  const render = () =>
    res.status(status).renderPage(view, {
      seo: { title: `${status === 404 ? 'Página não encontrada' : 'Erro'} | LC Serviços`, noindex: true },
      status,
      title: status === 404 ? 'Página não encontrada' : 'Algo deu errado',
      message: publicMessage,
      stack: !config.isProduction && status >= 500 ? err.stack : null,
    });

  // Se o erro aconteceu antes dos locals globais, cai para uma resposta simples.
  if (typeof res.renderPage !== 'function' || !res.locals.company) {
    return res.status(status).type('text/plain').send(publicMessage);
  }
  try {
    return render();
  } catch (renderError) {
    logger.error('Falha ao renderizar página de erro', renderError);
    return res.status(status).type('text/plain').send(publicMessage);
  }
}

module.exports = { notFound, errorHandler };
