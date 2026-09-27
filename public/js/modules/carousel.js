/** Indicadores (dots) para os planos no mobile, que viram carrossel com scroll-snap. */
export function initCarousel() {
  document.querySelectorAll('[data-carousel]').forEach((track) => {
    const dots = track.parentElement.querySelector('[data-carousel-dots]');
    const slides = [...track.children];
    if (!dots || slides.length < 2) return;

    const buttons = slides.map((slide, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.tabIndex = -1;
      button.addEventListener('click', () => {
        track.scrollTo({ left: slide.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft), behavior: 'smooth' });
      });
      button.dataset.index = String(index);
      dots.append(button);
      return button;
    });

    const update = () => {
      const center = track.scrollLeft + track.clientWidth / 2;
      let active = 0;
      slides.forEach((slide, index) => {
        const slideCenter = slide.offsetLeft - track.offsetLeft + slide.clientWidth / 2;
        const bestCenter = slides[active].offsetLeft - track.offsetLeft + slides[active].clientWidth / 2;
        if (Math.abs(slideCenter - center) < Math.abs(bestCenter - center)) active = index;
      });
      buttons.forEach((button, index) => button.setAttribute('aria-current', String(index === active)));
    };

    let frame = 0;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }, { passive: true });
    update();
  });
}
