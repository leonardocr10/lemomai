/** FaqAccordion: botões com aria-expanded controlando painéis (teclado nativo). */
export function initAccordion() {
  document.querySelectorAll('[data-accordion]').forEach((accordion) => {
    const triggers = [...accordion.querySelectorAll('.faq__trigger')];

    const setOpen = (trigger, open) => {
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));
      trigger.setAttribute('aria-expanded', String(open));
      trigger.closest('.faq__item')?.classList.toggle('is-open', open);
      if (!panel) return;
      if (open) {
        panel.hidden = false;
        // Próximo frame para a transição de altura acontecer.
        requestAnimationFrame(() => panel.classList.add('is-open'));
      } else {
        panel.hidden = true;
      }
    };

    triggers.forEach((trigger, index) => {
      trigger.addEventListener('click', () => {
        const open = trigger.getAttribute('aria-expanded') !== 'true';
        triggers.forEach((other) => other !== trigger && setOpen(other, false));
        setOpen(trigger, open);
      });

      trigger.addEventListener('keydown', (event) => {
        const keys = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: triggers.length - 1 };
        if (!(event.key in keys)) return;
        event.preventDefault();
        triggers[(keys[event.key] + triggers.length) % triggers.length].focus();
      });
    });
  });
}
