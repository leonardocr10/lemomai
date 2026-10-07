/**
 * Proteção CSRF por "double submit" com cookie assinado.
 *
 * - issueCsrfToken: garante um token por visitante em um cookie httpOnly
 *   assinado e o expõe às views em res.locals.csrfToken.
 * - verifyCsrf: em POST/PUT/PATCH/DELETE compara o token enviado no corpo
 *   (_csrf) ou no cabeçalho X-CSRF-Token com o do cookie.
 *
 * Deve rodar DEPOIS do parser do corpo (inclusive do multer em uploads).
 */
const crypto = require('node:crypto');
const config = require('../config');
const HttpError = require('../utils/http-error');

const COOKIE_NAME = 'lenom_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function issueCsrfToken(req, res, next) {
  let token = req.signedCookies?.[COOKIE_NAME];
  if (!token || typeof token !== 'string') {
    token = crypto.randomBytes(32).toString('base64url');
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.secureContext,
      signed: true,
      path: '/',
    });
  }
  req.csrfToken = token;
  res.locals.csrfToken = token;
  next();
}

function tokensMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const sent = req.body?._csrf || req.get('x-csrf-token');
  const expected = req.signedCookies?.[COOKIE_NAME];
  if (!tokensMatch(sent, expected)) {
    return next(HttpError.forbidden('Sessão do formulário expirada. Recarregue a página e tente novamente.'));
  }
  return next();
}

module.exports = { issueCsrfToken, verifyCsrf };
