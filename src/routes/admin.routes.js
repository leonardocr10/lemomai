const express = require('express');
const { verifyCsrf } = require('../middlewares/csrf');
const { loginLimiter } = require('../middlewares/security');
const { loadAdmin, requireAdmin, adminRender } = require('../middlewares/admin-auth');
const authController = require('../controllers/admin/auth.controller');
const { dashboard } = require('../controllers/admin/dashboard.controller');
const resources = require('../controllers/admin/resources');

const router = express.Router();
const urlencoded = express.urlencoded({ extended: false, limit: '100kb' });

router.use(adminRender, loadAdmin);

router.get('/login', authController.showLogin);
router.post('/login', loginLimiter, urlencoded, verifyCsrf, authController.submitLogin);
router.post('/logout', urlencoded, verifyCsrf, authController.logout);

// Daqui em diante: só com sessão, e todo POST com token CSRF.
router.use(requireAdmin, urlencoded, verifyCsrf);

router.get('/', dashboard);

const RESOURCES = [['planos', resources.plans], ['faq', resources.faq], ['depoimentos', resources.testimonials]];
for (const [path, controller] of RESOURCES) {
  router.get(`/${path}`, controller.list);
  router.get(`/${path}/novo`, controller.newForm);
  router.post(`/${path}`, controller.create);
  router.get(`/${path}/:id`, controller.editForm);
  router.post(`/${path}/:id`, controller.update);
  router.post(`/${path}/:id/excluir`, controller.remove);
}

module.exports = router;
