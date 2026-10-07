/**
 * Sessão do painel (cookie assinado e httpOnly restrito a /admin) e
 * res.renderAdmin, que renderiza uma tela dentro de views/admin/layout.ejs.
 */
const path = require('node:path');
const config = require('../config');
const auth = require('../services/auth.service');
const { asset } = require('../utils/assets');
const adminFmt = require('../utils/admin-format');
const { version: tablerVersion } = require('@tabler/core/package.json');

/** /vendor/... com versão do pacote na URL (cache invalidado ao atualizar o Tabler). */
const vendorAsset = (file) => `/vendor/${file}?v=${tablerVersion}`;

const COOKIE = 'lenom_admin';

async function loadAdmin(req, res, next) {
  try {
    const session = await auth.getSession(req.signedCookies?.[COOKIE]);
    req.admin = session;
    res.locals.admin = session;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (req.admin) return next();
  return res.redirect(302, '/admin/login');
}

function setSessionCookie(res, session) {
  res.cookie(COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.secureContext,
    signed: true,
    path: '/admin',
    expires: new Date(session.expiresAt),
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE, { path: '/admin' });
}

/** res.renderAdmin('plans/list', locals) -> views/admin/plans/list.ejs dentro de views/admin/layout.ejs */
function adminRender(req, res, next) {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.locals.asset = asset;
  res.locals.adminFmt = adminFmt;
  res.locals.vendorAsset = vendorAsset;
  res.renderAdmin = (view, locals = {}) => {
    const data = { section: null, notice: null, ...locals };
    res.render(path.join('admin', view), data, (err, body) => {
      if (err) return next(err);
      return res.render(path.join('admin', 'layout'), { ...data, body }, (layoutErr, html) =>
        (layoutErr ? next(layoutErr) : res.send(html)));
    });
  };
  next();
}

module.exports = { COOKIE, loadAdmin, requireAdmin, setSessionCookie, clearSessionCookie, adminRender };
