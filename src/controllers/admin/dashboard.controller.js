const repositories = require('../../repositories');

async function dashboard(req, res, next) {
  try {
    const [banners, plans, faq, testimonials, newLeads, totalLeads, latestLeads] = await Promise.all([
      repositories.banners.findAllAdmin(),
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
      pretitle: 'Visão geral',
      actions: [{ href: '/', label: 'Ver site', icon: 'external-link', variant: 'btn-outline-secondary', external: true }],
      stats: [
        { label: 'Leads novos', value: newLeads, href: '/admin/leads?status=new', icon: 'inbox', color: 'bg-primary text-white' },
        { label: 'Leads no total', value: totalLeads, href: '/admin/leads', icon: 'users', color: 'bg-azure text-white' },
        { label: 'Banners ativos', value: banners.filter((b) => b.active).length, href: '/admin/banners', icon: 'photo', color: 'bg-teal text-white' },
        { label: 'Planos ativos', value: plans.filter((p) => p.active).length, href: '/admin/planos', icon: 'receipt-2', color: 'bg-green text-white' },
        { label: 'Perguntas no FAQ', value: faq.filter((f) => f.active).length, href: '/admin/faq', icon: 'help-circle', color: 'bg-cyan text-white' },
      ],
      shortcuts: [
        { label: 'Novo banner', href: '/admin/banners/novo', icon: 'photo-plus' },
        { label: 'Editar preços', href: '/admin/planos', icon: 'receipt-2' },
        { label: 'Nova pergunta no FAQ', href: '/admin/faq/novo', icon: 'help-circle' },
        { label: 'Novo depoimento', href: '/admin/depoimentos/novo', icon: 'quote' },
        { label: 'Telefone e redes sociais', href: '/admin/empresa', icon: 'building' },
      ],
      latestLeads,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { dashboard };
