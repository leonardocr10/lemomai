/**
 * Google Analytics 4 e Meta Pixel. IDs vêm do .env (GA_MEASUREMENT_ID,
 * META_PIXEL_ID) via atributos data-* do <body>. Nada carrega sem consentimento.
 * Também registra eventos de conversão (lead, clique no WhatsApp).
 */
const loaded = { ga: false, pixel: false };

function loadScript(src) {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.append(script);
}

function loadGoogleAnalytics(id) {
  if (loaded.ga || !id) return;
  loaded.ga = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, { anonymize_ip: true });
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
}

function loadMetaPixel(id) {
  if (loaded.pixel || !id) return;
  loaded.pixel = true;
  const fbq = function fbq(...args) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  };
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = '2.0';
  window.fbq = window.fbq || fbq;
  window._fbq = window.fbq;
  loadScript('https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', id);
  window.fbq('track', 'PageView');
}

function track(name, params = {}) {
  if (loaded.ga && window.gtag) window.gtag('event', name, params);
  if (loaded.pixel && window.fbq) {
    if (name === 'generate_lead') window.fbq('track', 'Lead', params);
    if (name === 'contact') window.fbq('track', 'Contact', params);
  }
}

let listenersBound = false;
function bindConversionEvents() {
  if (listenersBound) return;
  listenersBound = true;
  window.addEventListener('lenom:lead', (event) => track('generate_lead', { form: event.detail.form }));
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-track]');
    if (!link) return;
    const name = link.dataset.track.startsWith('whatsapp') ? 'contact' : 'select_content';
    track(name, { item_id: link.dataset.track });
  });
}

export function loadAnalytics(consent = {}) {
  const { gaId, pixelId } = document.body.dataset;
  if (consent.analytics) loadGoogleAnalytics(gaId);
  if (consent.marketing) loadMetaPixel(pixelId);
  if (loaded.ga || loaded.pixel) bindConversionEvents();
}
