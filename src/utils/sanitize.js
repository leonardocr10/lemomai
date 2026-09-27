/**
 * Sanitização de entradas de texto livre. As views já escapam a saída com
 * <%= %>, mas os dados também vão para e-mails e para o banco, então
 * removemos marcação e caracteres de controle na entrada.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(CONTROL_CHARS, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/** Sanitiza todas as strings (1 nível) de um objeto. */
function sanitizeObject(input = {}) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = typeof value === 'string' ? sanitizeText(value) : value;
  }
  return output;
}

/** Escapa HTML para uso em conteúdos montados fora do EJS (ex.: e-mails). */
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

module.exports = { sanitizeText, sanitizeObject, escapeHtml };
