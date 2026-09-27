/** Toast: notificações não bloqueantes anunciadas por leitores de tela (aria-live). */
const ICONS = { success: 'check-circle-outline', error: 'alert', info: 'alert' };

export function showToast(message, type = 'info', { timeout = 6000 } = {}) {
  const region = document.querySelector('[data-toast-region]');
  if (!region) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const svgNs = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(svgNs, 'svg');
  icon.setAttribute('class', 'icon');
  icon.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(svgNs, 'use');
  use.setAttribute('href', `/icons/sprite.svg#${ICONS[type] || ICONS.info}`);
  icon.append(use);

  const text = document.createElement('p');
  text.textContent = message;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast__close';
  close.setAttribute('aria-label', 'Fechar notificação');
  close.textContent = '✕';

  const dismiss = () => {
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 400);
  };
  close.addEventListener('click', dismiss);

  toast.append(icon, text, close);
  region.append(toast);
  if (timeout) setTimeout(dismiss, timeout);
}
