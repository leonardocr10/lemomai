const express = require('express');
const { verifyCsrf } = require('../middlewares/csrf');
const { loginLimiter } = require('../middlewares/security');
const { loadAdmin, requireAdmin, adminRender } = require('../middlewares/admin-auth');
const { bannerUpload, galleryUpload, verifyCsrfAfterUpload } = require('../middlewares/banner-upload');
const gallery = require('../controllers/admin/gallery.controller');
const authController = require('../controllers/admin/auth.controller');
const { dashboard } = require('../controllers/admin/dashboard.controller');
const resources = require('../controllers/admin/resources');
const company = require('../controllers/admin/company.controller');
const leads = require('../controllers/admin/leads.controller');
const password = require('../controllers/admin/password.controller');

const router = express.Router();
const urlencoded = express.urlencoded({ extended: false, limit: '100kb' });

router.use(adminRender, loadAdmin);

router.get('/login', authController.showLogin);
router.post('/login', loginLimiter, urlencoded, verifyCsrf, authController.submitLogin);
router.post('/logout', urlencoded, verifyCsrf, authController.logout);

// Daqui em diante: só com sessão.
router.use(requireAdmin);

// Banners usam formulário multipart: o CSRF é conferido depois que o multer lê o corpo.
router.get('/banners', resources.banners.list);
router.get('/banners/novo', resources.banners.newForm);
router.post('/banners', bannerUpload, verifyCsrfAfterUpload, resources.banners.create);
router.post('/banners/lote', urlencoded, verifyCsrf, resources.banners.bulk);
router.get('/banners/:id', resources.banners.editForm);
router.post('/banners/:id', bannerUpload, verifyCsrfAfterUpload, resources.banners.update);
router.post('/banners/:id/excluir', urlencoded, verifyCsrf, resources.banners.remove);

// Galeria: envio multipart (CSRF depois do multer) e busca em JSON para o seletor.
router.get('/galeria', gallery.list);
router.get('/galeria.json', gallery.search);
router.post('/galeria', galleryUpload, verifyCsrfAfterUpload, gallery.upload);
router.post('/galeria/:id/excluir', urlencoded, verifyCsrf, gallery.remove);

// Demais rotas: todo POST com token CSRF (corpo multipart não é lido aqui e cai no 403).
router.use(urlencoded, verifyCsrf);

router.get('/', dashboard);

const RESOURCES = [['planos', resources.plans], ['faq', resources.faq], ['depoimentos', resources.testimonials]];
for (const [path, controller] of RESOURCES) {
  router.get(`/${path}`, controller.list);
  router.get(`/${path}/novo`, controller.newForm);
  router.post(`/${path}`, controller.create);
  router.post(`/${path}/lote`, controller.bulk);
  router.get(`/${path}/:id`, controller.editForm);
  router.post(`/${path}/:id`, controller.update);
  router.post(`/${path}/:id/excluir`, controller.remove);
}

router.get('/empresa', company.show);
router.post('/empresa', company.update);

router.get('/leads', leads.list);
router.post('/leads/lote', leads.bulk);
router.get('/leads/:id', leads.show);
router.post('/leads/:id/status', leads.updateStatus);

router.get('/senha', password.show);
router.post('/senha', password.update);

module.exports = router;
