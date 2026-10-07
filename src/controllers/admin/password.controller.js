const auth = require('../../services/auth.service');
const { validateAdmin } = require('../../validators/admin.validator');

const render = (res, status, { errors = {}, notice = null } = {}) =>
  res.status(status).renderAdmin('password', { title: 'Trocar senha', section: 'password', errors, notice });

function show(req, res) {
  render(res, 200, { notice: req.query.salvo ? 'Senha alterada. Outras sessões abertas foram encerradas.' : null });
}

async function update(req, res, next) {
  try {
    const result = validateAdmin('password', req.body);
    if (!result.success) return render(res, 422, { errors: result.errors });
    const changed = await auth.changePassword(req.admin.id, result.data.currentPassword, result.data.newPassword);
    if (!changed) return render(res, 422, { errors: { currentPassword: 'Senha atual incorreta.' } });
    return res.redirect(302, '/admin/senha?salvo=1');
  } catch (err) {
    return next(err);
  }
}

module.exports = { show, update };
