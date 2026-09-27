/**
 * Disponibiliza dados globais para todas as views e o helper res.renderPage,
 * que renderiza uma página dentro do layout principal.
 */
const path = require('node:path');
const config = require('../config');
const { mainNav, footerNav } = require('../config/navigation');
const companyService = require('../services/company.service');
const format = require('../utils/format');
const seo = require('../utils/seo');
const { asset } = require('../utils/assets');

const isActive = (item, currentPath) => (item.match ? item.match.test(currentPath) : false);

async function globalLocals(req, res, next) {
  try {
    const company = await companyService.getSettings();
    Object.assign(res.locals, {
      company,
      currentPath: req.path,
      mainNav: mainNav.map((item) => ({ ...item, active: isActive(item, req.path) })),
      footerNav,
      fmt: format,
      asset,
      jsonLd: seo.jsonLd,
      year: new Date().getFullYear(),
      analytics: config.analytics,
      // Schemas globais; páginas podem acrescentar outros em `schemas`.
      baseSchemas: [seo.organizationSchema(company), seo.localBusinessSchema(company)],
      schemas: [],
    });
    next();
  } catch (err) {
    next(err);
  }
}

/** res.renderPage('home', locals) -> views/pages/home.ejs dentro de views/layouts/main.ejs */
function renderPage(req, res, next) {
  res.renderPage = (view, locals = {}, layout = 'main') => {
    res.render(path.join('pages', view), locals, (err, body) => {
      if (err) return next(err);
      return res.render(path.join('layouts', layout), { ...locals, body }, (layoutErr, html) => {
        if (layoutErr) return next(layoutErr);
        return res.send(html);
      });
    });
  };
  next();
}

module.exports = { globalLocals, renderPage };
