/**
 * Configurações da empresa + links derivados (WhatsApp, redes).
 * Único lugar que decide o link de WhatsApp usado em todo o site.
 */
const repositories = require('../repositories');
const { remember } = require('../utils/cache');
const { buildWhatsAppUrl } = require('../utils/whatsapp');

const TTL = 60 * 1000;

async function getSettings() {
  return remember('company', TTL, async () => {
    const company = await repositories.company.get();
    return {
      ...company,
      whatsappUrl: buildWhatsAppUrl({ phone: company.whatsapp, message: company.whatsappMessage }),
      location: [company.city, company.state].filter(Boolean).join(' - '),
      socials: [
        { name: 'Instagram', icon: 'instagram', url: company.instagram },
        { name: 'LinkedIn', icon: 'linkedin', url: company.linkedin },
        { name: 'YouTube', icon: 'youtube', url: company.youtube },
      ].filter((social) => social.url),
    };
  });
}

/** Link de WhatsApp com mensagem personalizada (ex.: interesse em um plano). */
async function whatsappUrlFor(message) {
  const company = await getSettings();
  return buildWhatsAppUrl({ phone: company.whatsapp, message: message || company.whatsappMessage });
}

module.exports = { getSettings, whatsappUrlFor };
