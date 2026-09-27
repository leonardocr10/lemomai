/**
 * Monta links do WhatsApp (wa.me) de forma consistente.
 *
 *   buildWhatsAppUrl({ phone: '(11) 98765-4321', message: 'Olá!' })
 *   -> https://wa.me/5511987654321?text=Ol%C3%A1!
 *
 * Números sem DDI recebem o código do Brasil (55).
 */
function normalizePhone(phone, defaultCountryCode = '55') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  // 10 ou 11 dígitos = DDD + número brasileiro sem DDI.
  if (digits.length === 10 || digits.length === 11) return `${defaultCountryCode}${digits}`;
  return digits;
}

function buildWhatsAppUrl({ phone, message } = {}) {
  const number = normalizePhone(phone);
  if (!number) return null;
  const url = new URL(`https://wa.me/${number}`);
  if (message) url.searchParams.set('text', message);
  return url.toString();
}

module.exports = { buildWhatsAppUrl, normalizePhone };
