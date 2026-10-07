/** Botão "voltar ao topo": aparece depois de rolar uma tela e meia. */
export function initBackToTop() {
  const button = document.querySelector('[data-back-to-top]');
  if (!button) return;
  const update = () => button.classList.toggle('is-visible', window.scrollY > window.innerHeight * 1.5);
  window.addEventListener('scroll', update, { passive: true });
  update();
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    document.getElementById('conteudo')?.focus({ preventScroll: true });
  });
}
