/**
 * Configuração central da aplicação. Toda leitura de process.env acontece aqui,
 * o restante do código consome apenas este objeto.
 */
require('dotenv').config({ quiet: true });
const path = require('node:path');

const bool = (value, fallback = false) =>
  value === undefined || value === '' ? fallback : String(value).toLowerCase() === 'true';
const int = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const DRIVERS = ['sqlite', 'mock', 'mysql'];
/** DATA_DRIVER tem prioridade; USE_MOCK_DATA continua aceito por compatibilidade. */
function dataDriver() {
  const driver = String(process.env.DATA_DRIVER || '').toLowerCase();
  if (DRIVERS.includes(driver)) return driver;
  if (process.env.USE_MOCK_DATA === 'true') return 'mock';
  if (process.env.USE_MOCK_DATA === 'false') return 'mysql';
  return 'sqlite';
}

const env = process.env.NODE_ENV || 'development';
const appUrl = (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');

const config = {
  env,
  isProduction: env === 'production',
  // Produção servida por HTTPS (APP_URL com https://): cookies "Secure", HSTS e
  // upgrade-insecure-requests. Com APP_URL em http:// (ex.: acesso por IP:porta
  // antes de ter domínio), isso fica desligado para o login e os formulários funcionarem.
  secureContext: env === 'production' && appUrl.startsWith('https://'),
  port: int(process.env.PORT, 3000),
  appUrl,
  cookieSecret: process.env.COOKIE_SECRET || 'dev-only-secret-change-me',
  trustProxy: bool(process.env.TRUST_PROXY),
  dataDriver: dataDriver(),
  dataFile: process.env.DATA_FILE || path.resolve(__dirname, '../../storage/lenom.db'),
  admin: {
    user: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASSWORD || '',
  },

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: int(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || 'lenom_ai',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    logging: bool(process.env.DB_LOGGING),
  },

  mail: {
    driver: process.env.MAIL_DRIVER || 'log',
    from: process.env.MAIL_FROM || 'Lenom.AI <nao-responda@lenom.ai>',
    leadsTo: process.env.MAIL_TO_LEADS || '',
    smtp: {
      host: process.env.SMTP_HOST,
      port: int(process.env.SMTP_PORT, 587),
      secure: bool(process.env.SMTP_SECURE),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
    },
  },

  analytics: {
    gaMeasurementId: process.env.GA_MEASUREMENT_ID || '',
    metaPixelId: process.env.META_PIXEL_ID || '',
  },

  limits: {
    formRequestsPer15Min: int(process.env.FORM_RATE_LIMIT, 10),
    uploadMaxBytes: int(process.env.UPLOAD_MAX_MB, 5) * 1024 * 1024,
  },
};

if (config.isProduction && config.cookieSecret === 'dev-only-secret-change-me') {
  throw new Error('COOKIE_SECRET precisa ser definido em produção.');
}

module.exports = config;
