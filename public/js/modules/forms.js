/**
 * Formulários de contato/orçamento:
 * - validação no cliente com mensagens em português (o servidor valida de novo);
 * - envio via fetch para a API, com toast de retorno;
 * - sem JS, o formulário funciona com POST tradicional.
 */
import { showToast } from './toast.js';

const MESSAGES = {
  valueMissing: 'Este campo é obrigatório.',
  typeMismatch: 'Informe um e-mail válido.',
  tooShort: (el) => `Use pelo menos ${el.minLength} caracteres.`,
  tooLong: (el) => `Use no máximo ${el.maxLength} caracteres.`,
  phone: 'Informe um telefone com DDD.',
  checkbox: 'É necessário aceitar a Política de Privacidade.',
  radio: 'Selecione uma opção.',
  file: 'Arquivo muito grande.',
};

const digits = (value) => value.replace(/\D/g, '');

function maskPhone(value) {
  const d = digits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function fieldWrapper(form, name) {
  const errorEl = form.querySelector(`[data-error-for="${name}"]`);
  return { errorEl, wrapper: errorEl?.closest('.field') };
}

function setError(form, name, message) {
  const { errorEl, wrapper } = fieldWrapper(form, name);
  if (errorEl) errorEl.textContent = message || '';
  wrapper?.classList.toggle('has-error', Boolean(message));
  // Erro num campo dentro de "Mais detalhes": abre a seção para a pessoa ver.
  if (message) wrapper?.closest('details')?.setAttribute('open', '');
  form.querySelectorAll(`[name="${name}"]`).forEach((input) => {
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      if (errorEl?.id) input.setAttribute('aria-describedby', errorEl.id);
    } else {
      input.removeAttribute('aria-invalid');
    }
  });
}

function validateField(form, input) {
  const { name } = input;
  let message = '';

  if (input.type === 'radio') {
    const group = form.querySelectorAll(`[name="${name}"]`);
    if ([...group].some((el) => el.required) && ![...group].some((el) => el.checked)) message = MESSAGES.radio;
  } else if (input.type === 'checkbox') {
    if (input.required && !input.checked) message = MESSAGES.checkbox;
  } else if (input.type === 'file') {
    const file = input.files?.[0];
    const max = Number(input.dataset.maxBytes);
    if (file && max && file.size > max) message = `${MESSAGES.file} Limite: ${Math.round(max / 1024 / 1024)} MB.`;
  } else if (input.validity.valueMissing) {
    message = MESSAGES.valueMissing;
  } else if (input.validity.typeMismatch) {
    message = MESSAGES.typeMismatch;
  } else if (input.validity.tooShort) {
    message = MESSAGES.tooShort(input);
  } else if (input.validity.tooLong) {
    message = MESSAGES.tooLong(input);
  } else if (input.dataset.mask === 'phone' && input.value) {
    const count = digits(input.value).length;
    if (count < 10 || count > 13) message = MESSAGES.phone;
  }

  setError(form, name, message);
  return !message;
}

function validateForm(form) {
  const inputs = [...form.querySelectorAll('input[name], select[name], textarea[name]')].filter(
    (el) => el.type !== 'hidden' && el.name !== 'website',
  );
  const seen = new Set();
  let firstInvalid = null;
  for (const input of inputs) {
    if (input.type === 'radio' && seen.has(input.name)) continue;
    seen.add(input.name);
    if (!validateField(form, input) && !firstInvalid) firstInvalid = input;
  }
  return firstInvalid;
}

function clearErrors(form) {
  form.querySelectorAll('[data-error-for]').forEach((el) => setError(form, el.dataset.errorFor, ''));
  form.querySelectorAll('.alert').forEach((el) => el.remove());
}

function buildBody(form) {
  const data = new FormData(form);
  if (form.dataset.format === 'multipart') return { body: data, headers: {} };
  return {
    body: JSON.stringify(Object.fromEntries(data.entries())),
    headers: { 'Content-Type': 'application/json' },
  };
}

async function submit(form) {
  const button = form.querySelector('[type="submit"]');
  const token = form.querySelector('[name="_csrf"]')?.value;
  const { body, headers } = buildBody(form);

  const label = button?.querySelector('[data-btn-label]');
  const labelDefault = label?.textContent;

  button?.classList.add('is-loading');
  button?.setAttribute('disabled', '');
  if (label && button.dataset.loadingLabel) label.textContent = button.dataset.loadingLabel;
  try {
    const response = await fetch(form.dataset.endpoint, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json', 'X-CSRF-Token': token, ...headers },
      credentials: 'same-origin',
    });
    const result = await response.json().catch(() => ({}));

    if (response.ok && result.ok) {
      form.reset();
      clearErrors(form);
      form.querySelectorAll('[data-file-name]').forEach((el) => { el.textContent = el.dataset.default || el.textContent; });
      showToast(result.message || 'Enviado com sucesso!', 'success');
      window.dispatchEvent(new CustomEvent('lenom:lead', { detail: { form: form.id, endpoint: form.dataset.endpoint } }));
      // Troca o formulário pela confirmação, quando a página oferece uma.
      const panel = form.dataset.successPanel && document.querySelector(form.dataset.successPanel);
      if (panel) {
        form.hidden = true;
        panel.hidden = false;
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        panel.focus({ preventScroll: true });
      }
      return;
    }

    if (result.errors) {
      Object.entries(result.errors).forEach(([name, message]) => setError(form, name, message));
      form.querySelector('[aria-invalid="true"]')?.focus();
    }
    showToast(result.message || 'Não foi possível enviar. Tente novamente.', 'error');
  } catch {
    showToast('Falha de conexão. Verifique sua internet ou fale conosco pelo WhatsApp.', 'error');
  } finally {
    button?.classList.remove('is-loading');
    button?.removeAttribute('disabled');
    if (label && labelDefault) label.textContent = labelDefault;
  }
}

function initFileDrop(form) {
  form.querySelectorAll('[data-file-drop]').forEach((drop) => {
    const input = drop.querySelector('input[type="file"]');
    const label = drop.querySelector('[data-file-name]');
    if (!input || !label) return;
    label.dataset.default = label.textContent;

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      label.textContent = file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : label.dataset.default;
      validateField(form, input);
    });
    ['dragenter', 'dragover'].forEach((type) => input.addEventListener(type, () => drop.classList.add('is-dragover')));
    ['dragleave', 'drop'].forEach((type) => input.addEventListener(type, () => drop.classList.remove('is-dragover')));
  });
}

export function initForms() {
  document.querySelectorAll('[data-ajax-form]').forEach((form) => {
    form.querySelectorAll('[data-mask="phone"]').forEach((input) => {
      input.addEventListener('input', () => {
        input.value = maskPhone(input.value);
      });
    });

    // Valida ao sair do campo e limpa o erro enquanto o usuário corrige.
    form.addEventListener('focusout', (event) => {
      const input = event.target;
      if (input.name && input.type !== 'hidden' && (input.value || input.closest('.has-error'))) validateField(form, input);
    });
    // Revalida enquanto digita um campo com erro: a mensagem some antes do
    // usuário clicar no próximo campo, evitando que o layout "pule" no clique.
    ['input', 'change'].forEach((type) => {
      form.addEventListener(type, (event) => {
        if (event.target.closest('.has-error')) validateField(form, event.target);
      });
    });

    initFileDrop(form);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const firstInvalid = validateForm(form);
      if (firstInvalid) {
        (firstInvalid.closest('.field') || firstInvalid).scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
        showToast('Verifique os campos destacados.', 'error', { timeout: 4000 });
        return;
      }
      submit(form);
    });
  });
}
