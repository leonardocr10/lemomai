/**
 * EmailService: envio de e-mails transacionais.
 *
 *   MAIL_DRIVER=log  -> apenas registra no log (padrão / desenvolvimento)
 *   MAIL_DRIVER=smtp -> envia via nodemailer
 *
 * Uso previsto: notificação de contato, de orçamento e confirmação ao cliente.
 */
const config = require('../config');
const logger = require('../utils/logger');
const { escapeHtml } = require('../utils/sanitize');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  // Carregado sob demanda para não exigir SMTP em desenvolvimento.
  const nodemailer = require('nodemailer');
  const { host, port, secure, user, password } = config.mail.smtp;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass: password } : undefined,
  });
  return transporter;
}

async function send({ to, subject, text, html, replyTo }) {
  if (!to) {
    logger.warn('EmailService: destinatário vazio, e-mail ignorado', { subject });
    return { skipped: true };
  }

  if (config.mail.driver !== 'smtp') {
    logger.info(`EmailService[log] -> ${to} | ${subject}`);
    logger.debug(text);
    return { logged: true };
  }

  try {
    const info = await getTransporter().sendMail({ from: config.mail.from, to, subject, text, html, replyTo });
    logger.info(`EmailService[smtp] enviado -> ${to} | ${subject}`, { messageId: info.messageId });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    // Falha de e-mail não deve impedir o registro do lead.
    logger.error('EmailService: falha ao enviar e-mail', err);
    return { error: true };
  }
}

/** Monta um e-mail simples em texto e HTML a partir de pares rótulo/valor. */
function renderFields(title, fields) {
  const rows = fields.filter(([, value]) => value);
  const text = `${title}\n\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}`;
  const html = `<h2 style="font-family:Arial,sans-serif;color:#072b63">${escapeHtml(title)}</h2>
<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
${rows
  .map(
    ([label, value]) =>
      `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top"><strong>${escapeHtml(label)}</strong></td><td style="padding:6px 0;white-space:pre-line">${escapeHtml(value)}</td></tr>`,
  )
  .join('\n')}
</table>`;
  return { text, html };
}

const EmailService = {
  send,

  async notifyNewLead(lead, fields) {
    const title = lead.source === 'quote' ? 'Nova solicitação de orçamento' : 'Novo contato pelo site';
    const { text, html } = renderFields(title, fields);
    return send({ to: config.mail.leadsTo, subject: `[Site] ${title} — ${lead.name}`, text, html, replyTo: lead.email || undefined });
  },

  async sendLeadConfirmation(lead, companyName) {
    // O formulário de contato aceita envio sem e-mail (só WhatsApp): nada a confirmar.
    if (!lead.email) return null;
    const firstName = lead.name.split(' ')[0];
    const text = `Olá, ${firstName}!\n\nRecebemos sua mensagem e nossa equipe retornará em breve.\n\nEquipe ${companyName}`;
    const html = `<p style="font-family:Arial,sans-serif">Olá, ${escapeHtml(firstName)}!</p>
<p style="font-family:Arial,sans-serif">Recebemos sua mensagem e nossa equipe retornará em breve.</p>
<p style="font-family:Arial,sans-serif">Equipe ${escapeHtml(companyName)}</p>`;
    return send({ to: lead.email, subject: `Recebemos sua solicitação — ${companyName}`, text, html });
  },
};

module.exports = EmailService;
