/**
 * Conteúdo editável das seções do site (futura tabela site_sections).
 * Cada chave corresponde a um registro `key` com `content` em JSON.
 */
module.exports = {
  hero: {
    eyebrow: 'Soluções digitais para o seu negócio',
    titleStart: 'Sistemas e sites para fazer',
    titleHighlight: 'sua empresa crescer',
    subtitle:
      'A Lenom.AI cria sites profissionais, sistemas sob medida e soluções digitais que impulsionam o seu negócio.',
    primaryCta: { label: 'Ver planos', href: '/#precos' },
    secondaryCta: { label: 'Solicitar orçamento', href: '/orcamento' },
    highlights: [
      { icon: 'monitor', title: 'Sites profissionais', text: 'Modernos e otimizados' },
      { icon: 'settings', title: 'Sistemas sob medida', text: 'Para o seu negócio' },
      { icon: 'headset', title: 'Suporte especializado', text: 'Do planejamento ao resultado' },
    ],
    handwritten: 'Ideias em soluções reais',
  },

  // Faixa logo abaixo do banner da home: o que a empresa garante (sem números inventados).
  highlights: [
    { icon: 'diamond', title: 'Projeto sob medida', text: 'Feito para o seu processo' },
    { icon: 'headset', title: 'Suporte contínuo', text: 'Acompanhamento após a entrega' },
    { icon: 'cpu', title: 'Tecnologia moderna', text: 'Rápido, seguro e escalável' },
    { icon: 'map-pin', title: 'Todo o Brasil', text: 'Atendimento remoto' },
  ],

  services: {
    eyebrow: 'Nossos serviços',
    title: 'Soluções completas para o',
    highlight: 'seu negócio',
    subtitle: 'Do site institucional ao sistema completo, temos a solução ideal para a sua empresa.',
  },

  pricing: {
    eyebrow: 'Nossos planos',
    title: 'Escolha o plano ideal',
    highlight: 'para o seu projeto',
    subtitle: 'Planos transparentes, sem surpresas. Soluções para cada etapa do seu negócio.',
    perks: [
      { icon: 'credit-card', text: 'Pagamento facilitado' },
      { icon: 'refresh', text: 'Suporte em todas as etapas' },
      { icon: 'target', text: 'Solução sob medida para sua empresa' },
    ],
  },

  differentials: {
    eyebrow: 'Nossos diferenciais',
    title: 'Por que escolher a',
    highlight: 'Lenom.AI?',
    items: [
      { icon: 'users', title: 'Atendimento personalizado', text: 'Entendemos sua necessidade e criamos a melhor solução.' },
      { icon: 'diamond', title: 'Projeto profissional', text: 'Design moderno, foco em resultados e alta qualidade.' },
      { icon: 'cpu', title: 'Tecnologia moderna', text: 'Utilizamos tecnologias atuais e seguras.' },
      { icon: 'shield', title: 'Suporte contínuo', text: 'Acompanhamento mesmo após a entrega do projeto.' },
      { icon: 'trending-up', title: 'Soluções escaláveis', text: 'Projetos preparados para acompanhar o crescimento da empresa.' },
      { icon: 'code', title: 'Código sob medida', text: 'Sem depender de templates genéricos para sistemas críticos.' },
    ],
  },

  portfolio: {
    eyebrow: 'Portfólio',
    title: 'Projetos',
    highlight: 'desenvolvidos',
    subtitle: 'Soluções reais que entregamos para empresas de diferentes segmentos.',
  },

  process: {
    eyebrow: 'Como funciona',
    title: 'Como funciona',
    highlight: 'nosso processo',
    subtitle: 'Um processo claro, com você acompanhando cada etapa do projeto.',
    steps: [
      { icon: 'search', title: 'Entendemos sua necessidade', text: 'Conversamos sobre objetivos, público e processos da sua empresa.' },
      { icon: 'clipboard', title: 'Planejamos a solução', text: 'Definimos escopo, tecnologias, prazos e investimento.' },
      { icon: 'code', title: 'Desenvolvemos', text: 'Design e desenvolvimento com as melhores práticas do mercado.' },
      { icon: 'eye', title: 'Você acompanha', text: 'Entregas parciais para validação e ajustes ao longo do caminho.' },
      { icon: 'rocket', title: 'Implantamos', text: 'Publicação, configuração do ambiente e treinamento da equipe.' },
      { icon: 'headset', title: 'Damos suporte', text: 'Acompanhamento contínuo, manutenção e evolução do projeto.' },
    ],
  },

  testimonials: {
    eyebrow: 'Depoimentos',
    title: 'O que dizem',
    highlight: 'nossos clientes',
  },

  cta: {
    title: 'Pronto para tirar seu projeto do papel?',
    subtitle: 'Conte sua ideia e receba uma proposta personalizada sem compromisso.',
    primaryCta: { label: 'Solicitar orçamento', href: '/orcamento' },
  },

  faq: {
    eyebrow: 'Dúvidas frequentes',
    title: 'Perguntas',
    highlight: 'frequentes',
  },

  contact: {
    eyebrow: 'Contato',
    title: 'Vamos conversar sobre o',
    highlight: 'seu projeto?',
    subtitle: 'Preencha o formulário e retornaremos em até 1 dia útil.',
  },

  plansPage: {
    hero: {
      eyebrow: 'Soluções SaaS',
      title: 'Sistemas em nuvem com',
      highlight: 'mensalidade acessível',
      subtitle:
        'Escolha o plano ideal para organizar e fazer sua empresa crescer. Hospedagem, atualizações, backup e suporte inclusos.',
    },
    saas: {
      eyebrow: 'Planos SaaS',
      title: 'Compare os',
      highlight: 'planos',
      subtitle: 'Sem taxa de implantação nos planos mensais. Cancele quando quiser.',
    },
    includes: [
      { icon: 'cloud', text: 'Hospedagem em nuvem' },
      { icon: 'refresh', text: 'Atualizações contínuas' },
      { icon: 'shield', text: 'Backup e segurança' },
      { icon: 'headset', text: 'Suporte técnico' },
    ],
    projects: {
      eyebrow: 'Projetos sob medida',
      title: 'Prefere uma solução',
      highlight: 'exclusiva?',
      subtitle: 'Também desenvolvemos sites, landing pages e sistemas personalizados com investimento único.',
    },
    cta: {
      title: 'Não sabe qual plano escolher?',
      subtitle: 'Nossa equipe ajuda você a encontrar a solução ideal para o momento da sua empresa.',
      primaryCta: { label: 'Falar com especialista', href: '/orcamento?tipo=saas' },
    },
  },

  about: {
    title: 'Tecnologia para transformar ideias em',
    highlight: 'soluções reais',
    intro:
      'A Lenom.AI desenvolve sites, sistemas e soluções digitais sob medida para empresas que desejam modernizar processos, aumentar produtividade e crescer com tecnologia.',
    paragraphs: [
      'Unimos design, desenvolvimento e atendimento próximo para entregar projetos que resolvem problemas reais. Cada solução é pensada a partir da rotina do cliente, com foco em usabilidade, desempenho e segurança.',
      'Atendemos empresas de diferentes portes e segmentos, desde a primeira presença digital até sistemas completos de gestão, sempre com suporte contínuo após a entrega.',
    ],
    mission: {
      title: 'Missão',
      text: 'Criar soluções digitais sob medida que simplifiquem processos e impulsionem o crescimento dos nossos clientes.',
    },
    vision: {
      title: 'Visão',
      text: 'Ser referência em desenvolvimento de sistemas e sites para empresas que buscam tecnologia com atendimento próximo.',
    },
    values: {
      title: 'Valores',
      items: ['Transparência', 'Qualidade técnica', 'Compromisso com prazos', 'Parceria de longo prazo', 'Inovação com propósito'],
    },
  },
};
