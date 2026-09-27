const express = require('express');
const pages = require('../controllers/pages.controller');
const leads = require('../controllers/leads.controller');
const seoController = require('../controllers/seo.controller');
const { formLimiter } = require('../middlewares/security');
const { verifyCsrf } = require('../middlewares/csrf');
const { handleQuoteUpload } = require('../middlewares/upload');

const router = express.Router();
const urlencoded = express.urlencoded({ extended: false, limit: '50kb' });

router.get('/', pages.home);
router.get('/servicos', pages.services);
router.get('/servicos/:slug', pages.serviceDetail);
router.get('/planos', pages.plans);
router.get('/portfolio', pages.portfolio);
router.get('/portfolio/:slug', pages.portfolioDetail);
router.get('/sobre', pages.about);

router.get('/contato', leads.showContact);
router.post('/contato', formLimiter, urlencoded, verifyCsrf, leads.submitContact);
router.get('/orcamento', leads.showQuote);
router.post('/orcamento', formLimiter, handleQuoteUpload, verifyCsrf, leads.submitQuote);

router.get('/politica-de-privacidade', pages.privacy);
router.get('/termos-de-uso', pages.terms);
router.get('/politica-de-cookies', pages.cookies);

router.get('/sitemap.xml', seoController.sitemap);
router.get('/robots.txt', seoController.robots);
router.get('/site.webmanifest', seoController.manifest);

module.exports = router;
