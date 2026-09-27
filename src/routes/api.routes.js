const express = require('express');
const api = require('../controllers/api.controller');
const { apiLimiter, formLimiter } = require('../middlewares/security');
const { verifyCsrf } = require('../middlewares/csrf');
const { handleQuoteUpload } = require('../middlewares/upload');

const router = express.Router();
const json = express.json({ limit: '50kb' });
const urlencoded = express.urlencoded({ extended: false, limit: '50kb' });

router.use(apiLimiter);
router.use((req, res, next) => {
  res.set('Cache-Control', req.method === 'GET' ? 'public, max-age=60' : 'no-store');
  next();
});

router.get('/csrf-token', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
}, api.csrfToken);

router.get('/services', api.services);
router.get('/services/:slug', api.service);
router.get('/plans', api.plans);
router.get('/portfolio', api.portfolio);
router.get('/portfolio/:slug', api.portfolioProject);
router.get('/testimonials', api.testimonials);
router.get('/faq', api.faq);

// Contato: JSON ou urlencoded. Orçamento: multipart (FormData) por causa do anexo.
router.post('/contact', formLimiter, json, urlencoded, verifyCsrf, api.contact);
router.post('/quote', formLimiter, handleQuoteUpload, json, verifyCsrf, api.quote);

module.exports = router;
