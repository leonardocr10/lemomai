const repositories = require('../../repositories');

async function dashboard(req, res, next) {
  try {
    const [plans, faq, testimonials, newLeads, totalLeads, latestLeads] = await Promise.all([
      repositories.plans.findAllAdmin(),
      repositories.faq.findAllAdmin(),
      repositories.testimonials.findAllAdmin(),
      repositories.leads.count({ status: 'new' }),
      repositories.leads.count(),
      repositories.leads.findAll({ limit: 5 }),
    ]);
    res.renderAdmin('dashboard', {
      title: 'Painel',
      section: 'dashboard',
      stats: [
        { label: 'Leads novos', value: newLeads, href: '/admin/leads?status=new' },
        { label: 'Leads no total', value: totalLeads, href: '/admin/leads' },
        { label: 'Planos ativos', value: plans.filter((p) => p.active).length, href: '/admin/planos' },
        { label: 'Perguntas no FAQ', value: faq.filter((f) => f.active).length, href: '/admin/faq' },
        { label: 'Depoimentos ativos', value: testimonials.filter((t) => t.active).length, href: '/admin/depoimentos' },
      ],
      latestLeads,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { dashboard };
