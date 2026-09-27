/**
 * Opções dos formulários. Compartilhadas entre views (selects) e validadores,
 * garantindo que o servidor só aceite valores oferecidos na interface.
 */
const contactProjectTypes = [
  { value: 'site-institucional', label: 'Site institucional' },
  { value: 'landing-page', label: 'Landing page' },
  { value: 'e-commerce', label: 'E-commerce' },
  { value: 'sistema-sob-medida', label: 'Sistema sob medida' },
  { value: 'saas', label: 'SaaS' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'outro', label: 'Outro' },
];

const quoteProjectTypes = [
  { value: 'site', label: 'Site' },
  { value: 'e-commerce', label: 'E-commerce' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'saas', label: 'SaaS' },
  { value: 'landing-page', label: 'Landing Page' },
  { value: 'integracao', label: 'Integração' },
  { value: 'outro', label: 'Outro' },
];

const budgetRanges = [
  { value: 'ate-2000', label: 'Até R$ 2.000' },
  { value: '2000-5000', label: 'R$ 2.000–5.000' },
  { value: '5000-10000', label: 'R$ 5.000–10.000' },
  { value: '10000-25000', label: 'R$ 10.000–25.000' },
  { value: 'acima-25000', label: 'Acima de R$ 25.000' },
];

const deadlines = [
  { value: 'urgente', label: 'Urgente' },
  { value: '30-dias', label: '30 dias' },
  { value: '60-dias', label: '60 dias' },
  { value: '90-dias', label: '90 dias' },
  { value: 'sem-prazo', label: 'Sem prazo definido' },
];

const attachment = {
  accept: '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.zip',
  mimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed',
  ],
};

const leadStatuses = ['new', 'contacted', 'proposal', 'won', 'lost'];

const labelOf = (options, value) => options.find((o) => o.value === value)?.label || value;

module.exports = {
  contactProjectTypes,
  quoteProjectTypes,
  budgetRanges,
  deadlines,
  attachment,
  leadStatuses,
  labelOf,
};
