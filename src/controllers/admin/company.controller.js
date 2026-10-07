const repositories = require('../../repositories');
const adminService = require('../../services/admin.service');
const { validateAdmin } = require('../../validators/admin.validator');

const render = (res, status, { values, errors, notice = null }) =>
  res.status(status).renderAdmin('company', {
    title: 'Dados da empresa',
    pretitle: 'Contato, redes e endereço exibidos no site',
    section: 'company',
    values,
    errors,
    notice,
  });

async function show(req, res, next) {
  try {
    render(res, 200, { values: await repositories.company.get(), errors: {}, notice: req.query.salvo ? 'Dados salvos.' : null });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = validateAdmin('company', req.body);
    if (!result.success) return render(res, 422, { values: req.body, errors: result.errors });
    const current = await repositories.company.get();
    await repositories.company.update({ ...current, ...result.data });
    adminService.saved();
    return res.redirect(302, '/admin/empresa?salvo=1');
  } catch (err) {
    return next(err);
  }
}

module.exports = { show, update };
