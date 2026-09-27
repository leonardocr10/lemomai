/**
 * Consentimento de cookies (LGPD). Guarda a escolha em um cookie próprio
 * e só carrega Analytics/Pixel quando a categoria foi autorizada.
 */
import { loadAnalytics } from './analytics.js';

const COOKIE = 'lc_consent';
const MAX_AGE = 60 * 60 * 24 * 180; // 180 dias

function readConsent() {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${COOKIE}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split('=')[1]));
  } catch {
    return null;
  }
}

function writeConsent(consent) {
  const value = encodeURIComponent(JSON.stringify({ ...consent, date: new Date().toISOString().slice(0, 10) }));
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE}=${value}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

export function initCookies() {
  const banner = document.querySelector('[data-cookie-banner]');
  const modal = document.querySelector('[data-cookie-modal]');
  const form = modal?.querySelector('[data-cookie-form]');

  const apply = (consent) => {
    writeConsent(consent);
    if (banner) banner.hidden = true;
    if (modal?.open) modal.close();
    loadAnalytics(consent);
  };

  const openPreferences = () => {
    if (!modal || !form) return;
    const current = readConsent() || {};
    form.elements.analytics.checked = Boolean(current.analytics);
    form.elements.marketing.checked = Boolean(current.marketing);
    if (typeof modal.showModal === 'function') modal.showModal();
  };

  const existing = readConsent();
  if (existing) loadAnalytics(existing);
  else if (banner) banner.hidden = false;

  document.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.matches('[data-cookie-accept]')) apply({ analytics: true, marketing: true });
    else if (target.matches('[data-cookie-reject]')) apply({ analytics: false, marketing: false });
    else if (target.matches('[data-cookie-open], [data-cookie-preferences]')) openPreferences();
    else if (target.matches('[data-modal-close]')) target.closest('dialog')?.close();
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    apply({ analytics: form.elements.analytics.checked, marketing: form.elements.marketing.checked });
  });

  // Fecha o modal ao clicar no backdrop.
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) modal.close();
  });
}
