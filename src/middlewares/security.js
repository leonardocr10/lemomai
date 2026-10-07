/**
 * Cabeçalhos de segurança (Helmet + CSP) e limites de requisição.
 */
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const config = require('../config');

function contentSecurityPolicy() {
  const scriptSrc = ["'self'"];
  const connectSrc = ["'self'"];
  // blob: = prévia local das imagens escolhidas no painel (antes do envio).
  const imgSrc = ["'self'", 'data:', 'blob:'];

  if (config.analytics.gaMeasurementId) {
    scriptSrc.push('https://www.googletagmanager.com');
    connectSrc.push('https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com');
    imgSrc.push('https://*.google-analytics.com', 'https://*.googletagmanager.com');
  }
  if (config.analytics.metaPixelId) {
    scriptSrc.push('https://connect.facebook.net');
    connectSrc.push('https://www.facebook.com');
    imgSrc.push('https://www.facebook.com');
  }

  return {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc,
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc,
      connectSrc,
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.secureContext ? [] : null,
    },
  };
}

const securityHeaders = helmet({
  contentSecurityPolicy: contentSecurityPolicy(),
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: config.secureContext ? undefined : false,
});

/** Envio de formulários: protege contra spam/abuso. */
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.limits.formRequestsPer15Min,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    const message = 'Muitas tentativas de envio. Aguarde alguns minutos e tente novamente.';
    if (req.originalUrl.startsWith('/api/') || req.accepts(['html', 'json']) === 'json') {
      return res.status(429).json({ ok: false, message });
    }
    return res.status(429).renderPage('errors/error', {
      seo: { title: 'Muitas tentativas | Lenom.AI', noindex: true },
      status: 429,
      title: 'Muitas tentativas',
      message,
    });
  },
});

/** Leitura da API pública. */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/** Login do painel: 10 tentativas erradas por IP a cada 15 minutos. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => res.status(429).type('text/plain').send('Muitas tentativas de login. Aguarde 15 minutos.'),
});

module.exports = { securityHeaders, formLimiter, apiLimiter, loginLimiter };
