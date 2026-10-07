const auth = require('../../services/auth.service');
const { setSessionCookie, clearSessionCookie, COOKIE } = require('../../middlewares/admin-auth');
const { validateAdmin } = require('../../validators/admin.validator');

const renderLogin = (res, status, { values = {}, errors = {} } = {}) =>
  res.status(status).renderAdmin('login', { title: 'Entrar', values, errors, layout: 'bare' });

function showLogin(req, res) {
  if (req.admin) return res.redirect(302, '/admin');
  return renderLogin(res, 200);
}

async function submitLogin(req, res, next) {
  try {
    const values = { username: req.body?.username || '' };
    const result = validateAdmin('login', req.body);
    if (!result.success) return renderLogin(res, 422, { values, errors: result.errors });
    const session = await auth.login(result.data.username, result.data.password);
    if (!session) return renderLogin(res, 401, { values, errors: { form: 'Usuário ou senha inválidos.' } });
    setSessionCookie(res, session);
    return res.redirect(302, '/admin');
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    await auth.logout(req.signedCookies?.[COOKIE]);
    clearSessionCookie(res);
    return res.redirect(302, '/admin/login');
  } catch (err) {
    return next(err);
  }
}

module.exports = { showLogin, submitLogin, logout };
