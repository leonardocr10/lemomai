/**
 * Comportamentos do painel (Tabler já cuida de menu, modais e alertas):
 * - confirmação em modal para formulários/botões com data-confirm
 * - seleção em massa nas listas
 * - envio automático de selects com data-autosubmit
 * - avisos de sucesso que somem sozinhos
 * - área de imagem: arrastar e soltar, prévia, dimensões, proporção e recorte (Cropper.js)
 */
(function () {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const Modal = () => window.tabler && window.tabler.Modal;

  /* ---------- Confirmação ---------- */
  function setupConfirm() {
    const modalEl = $('#confirm-modal');
    let pending = null;

    document.addEventListener('submit', (event) => {
      const form = event.target;
      const submitter = event.submitter;
      const message = submitter?.getAttribute('data-confirm') || form.getAttribute('data-confirm');
      if (!message || form.dataset.confirmed === 'true') return;
      event.preventDefault();
      if (!modalEl || !Modal()) {
        if (window.confirm(message)) confirmAndSubmit(form, submitter);
        return;
      }
      pending = { form, submitter };
      $('[data-confirm-message]', modalEl).textContent = message;
      Modal().getOrCreateInstance(modalEl).show();
    });

    modalEl?.querySelector('[data-confirm-accept]').addEventListener('click', () => {
      Modal().getOrCreateInstance(modalEl).hide();
      if (pending) confirmAndSubmit(pending.form, pending.submitter);
      pending = null;
    });
  }

  function confirmAndSubmit(form, submitter) {
    form.dataset.confirmed = 'true';
    if (submitter && submitter.form === form) form.requestSubmit(submitter);
    else form.requestSubmit();
  }

  /* ---------- Seleção em massa ---------- */
  function setupBulk() {
    $$('[data-bulk]').forEach((root) => {
      const all = $('[data-bulk-all]', root);
      const items = $$('[data-bulk-item]', root);
      const bar = $('[data-bulkbar]', root);
      const count = $('[data-bulk-count]', root);
      if (!bar) return;
      const update = () => {
        const checked = items.filter((item) => item.checked).length;
        count.textContent = String(checked);
        bar.classList.toggle('is-visible', checked > 0);
        if (all) {
          all.checked = checked > 0 && checked === items.length;
          all.indeterminate = checked > 0 && checked < items.length;
        }
      };
      all?.addEventListener('change', () => {
        items.forEach((item) => { item.checked = all.checked; });
        update();
      });
      items.forEach((item) => item.addEventListener('change', update));
      update();
    });
  }

  /* ---------- Pequenos ---------- */
  function setupAutosubmit() {
    $$('[data-autosubmit]').forEach((field) => field.addEventListener('change', () => field.form.requestSubmit()));
  }

  function setupAutohide() {
    $$('[data-autohide]').forEach((alert) => {
      setTimeout(() => {
        alert.classList.remove('show');
        alert.classList.add('fade');
        setTimeout(() => alert.remove(), 300);
      }, 5000);
    });
  }

  /* ---------- Área de imagem ---------- */
  const formatBytes = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

  function ratioWarning(rule, width, height) {
    if (!width || !height) return '';
    const ratio = width / height;
    if (rule === '3' && Math.abs(ratio - 3) / 3 > 0.03) {
      return `A imagem tem ${width}×${height} px. O ideal para o banner é 3:1 (ex.: 2000×667) — use "Recortar" para ajustar.`;
    }
    if (rule === 'portrait' && ratio > 1.05) {
      return `A imagem tem ${width}×${height} px (horizontal). No celular use imagem vertical ou quadrada — use "Recortar".`;
    }
    return '';
  }

  function setupDropzone(zone) {
    const input = $('[data-dropzone-input]', zone);
    const empty = $('[data-dropzone-empty]', zone);
    const filled = $('[data-dropzone-filled]', zone);
    const preview = $('[data-dropzone-preview]', zone);
    const meta = $('[data-dropzone-meta]', zone);
    const warning = $('[data-dropzone-warning]', zone);
    const actions = $('[data-dropzone-actions]', zone);
    const removeButton = $('[data-dropzone-remove]', zone);
    const removeField = $('[data-dropzone-remove-field]', zone);
    const removeFlag = $('[data-dropzone-remove-flag]', zone);
    const cropButton = $('[data-dropzone-crop]', zone);
    const originalSrc = preview.getAttribute('src') || '';
    let objectUrl = null;

    // Com JS: esconde o input nativo e mostra a área de arrastar/soltar.
    zone.classList.add('is-enhanced');
    input.classList.add('admin-dropzone__input');
    actions.hidden = false;
    if (removeField) removeField.hidden = true;

    const show = (hasImage) => {
      empty.hidden = hasImage;
      filled.hidden = !hasImage;
    };

    function describe(width, height, file) {
      const parts = [`${width}×${height} px`];
      if (file) parts.push(formatBytes(file.size), file.name);
      else parts.push('imagem atual');
      meta.textContent = parts.join(' · ');
      const text = ratioWarning(zone.dataset.ratio, width, height);
      warning.textContent = text;
      warning.hidden = !text;
    }

    function setFile(file) {
      if (!file) return;
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        warning.textContent = 'Formato não aceito. Use JPG, PNG ou WebP.';
        warning.hidden = false;
        show(true);
        return;
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(file);
      preview.onload = () => describe(preview.naturalWidth, preview.naturalHeight, file);
      preview.src = objectUrl;
      if (removeFlag) removeFlag.checked = false;
      show(true);
    }

    /** Coloca um arquivo (ex.: o recorte) no input, como se o usuário tivesse escolhido. */
    function replaceInputFile(file) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      setFile(file);
    }

    input.addEventListener('change', () => setFile(input.files[0]));

    ['dragenter', 'dragover'].forEach((type) => zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.add('is-dragover');
    }));
    ['dragleave', 'dragend', 'drop'].forEach((type) => zone.addEventListener(type, (event) => {
      if (type === 'dragleave' && zone.contains(event.relatedTarget)) return;
      zone.classList.remove('is-dragover');
    }));
    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0];
      if (file) replaceInputFile(file);
    });

    removeButton?.addEventListener('click', () => {
      input.value = '';
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = null;
      preview.removeAttribute('src');
      warning.hidden = true;
      meta.textContent = '';
      if (removeFlag) removeFlag.checked = Boolean(originalSrc);
      show(false);
    });

    cropButton?.addEventListener('click', () => openCropper(zone, preview.src, replaceInputFile));

    if (originalSrc) {
      if (preview.complete && preview.naturalWidth) describe(preview.naturalWidth, preview.naturalHeight, null);
      else preview.addEventListener('load', () => describe(preview.naturalWidth, preview.naturalHeight, null), { once: true });
    }
    show(Boolean(originalSrc));
  }

  /* ---------- Recorte (Cropper.js 1.x) ---------- */
  const ASPECTS = { 3: '3:1', 0.8: '4:5 (vertical)', 1: '1:1 (quadrada)', free: 'Livre' };
  const MAX_OUTPUT = { 3: { width: 2000, height: 667 }, default: { width: 1350, height: 1350 } };

  function openCropper(zone, src, onDone) {
    const modalEl = $('#cropper-modal');
    if (!modalEl || !window.Cropper || !Modal()) return;
    const image = $('[data-cropper-image]', modalEl);
    const aspectsBox = $('[data-cropper-aspects]', modalEl);
    const info = $('[data-cropper-info]', modalEl);
    const applyButton = $('[data-cropper-apply]', modalEl);
    const aspects = (zone.dataset.crop || 'free').split(',');
    let cropper = null;
    let aspect = aspects[0];

    const ratioOf = (key) => (key === 'free' ? NaN : Number(key));

    aspectsBox.replaceChildren(...aspects.map((key) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-sm';
      button.textContent = ASPECTS[key] || key;
      button.setAttribute('aria-pressed', String(key === aspect));
      button.addEventListener('click', () => {
        aspect = key;
        $$('button', aspectsBox).forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        cropper?.setAspectRatio(ratioOf(key));
      });
      return button;
    }));
    aspectsBox.hidden = aspects.length < 2;

    const updateInfo = () => {
      const data = cropper?.getData(true);
      if (data) info.textContent = `Área selecionada: ${data.width}×${data.height} px`;
    };

    const onShown = () => {
      cropper = new window.Cropper(image, {
        aspectRatio: ratioOf(aspect),
        viewMode: 1,
        autoCropArea: 1,
        checkOrientation: false,
        checkCrossOrigin: false,
        responsive: true,
        crop: updateInfo,
      });
    };
    const onHidden = () => {
      cropper?.destroy();
      cropper = null;
      applyButton.onclick = null;
      modalEl.removeEventListener('shown.bs.modal', onShown);
      modalEl.removeEventListener('hidden.bs.modal', onHidden);
    };
    modalEl.addEventListener('shown.bs.modal', onShown);
    modalEl.addEventListener('hidden.bs.modal', onHidden);

    applyButton.onclick = () => {
      if (!cropper) return;
      const max = MAX_OUTPUT[aspect] || MAX_OUTPUT.default;
      const canvas = cropper.getCroppedCanvas({
        maxWidth: max.width,
        maxHeight: max.height,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        fillColor: '#ffffff',
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        onDone(new File([blob], `recorte-${Date.now()}.webp`, { type: 'image/webp' }));
        Modal().getOrCreateInstance(modalEl).hide();
      }, 'image/webp', 0.9);
    };

    image.src = src;
    Modal().getOrCreateInstance(modalEl).show();
  }

  function init() {
    setupConfirm();
    setupBulk();
    setupAutosubmit();
    setupAutohide();
    $$('[data-dropzone]').forEach(setupDropzone);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
