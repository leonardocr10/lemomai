/**
 * Carrossel de banners da home: scroll-snap (arrastar no celular), setas,
 * bolinhas e troca automática a cada 6 s com botão de pausa. A troca
 * automática pausa com mouse/foco dentro do carrossel e não acontece com
 * "reduzir movimento". Slides ocultos no celular (sem imagem mobile) são ignorados.
 */
const INTERVAL = 6000;

function setup(root) {
  const track = root.querySelector('[data-banner-track]');
  const slides = [...track.querySelectorAll('[data-banner-slide]')];
  const dotsBox = root.querySelector('[data-banner-dots]');
  if (!dotsBox) return;

  const pauseButton = root.querySelector('[data-banner-pause]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let userPaused = reducedMotion;
  let hovering = false;
  let timer = null;
  let index = 0;
  let dots = [];

  const visibleSlides = () => slides.filter((slide) => getComputedStyle(slide).display !== 'none');

  function update() {
    const list = visibleSlides();
    const center = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    list.forEach((slide, i) => {
      const distance = Math.abs(slide.offsetLeft + slide.clientWidth / 2 - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    index = best;
    dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === best)));
    // Só o slide visível recebe foco/leitura; os outros ficam inertes.
    list.forEach((slide, i) => { slide.inert = i !== best; });
  }

  function go(target, smooth = true) {
    const list = visibleSlides();
    if (!list.length) return;
    index = (target + list.length) % list.length;
    track.scrollTo({ left: list[index].offsetLeft, behavior: smooth && !reducedMotion ? 'smooth' : 'auto' });
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  function start() {
    stop();
    if (userPaused || hovering || document.hidden || visibleSlides().length < 2) return;
    timer = setInterval(() => go(index + 1), INTERVAL);
  }

  function buildDots() {
    const list = visibleSlides();
    dots = list.map((slide, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'banner-carousel__dot';
      dot.setAttribute('aria-label', `Ir para o banner ${i + 1}`);
      dot.addEventListener('click', () => {
        go(i);
        start();
      });
      return dot;
    });
    dotsBox.replaceChildren(...dots);
    root.classList.toggle('is-single', list.length < 2);
    go(0, false);
    update();
  }

  function renderPause() {
    pauseButton.setAttribute('aria-pressed', String(userPaused));
    pauseButton.setAttribute('aria-label', userPaused ? 'Continuar troca automática' : 'Pausar troca automática');
    root.classList.toggle('is-paused', userPaused);
  }

  root.querySelector('[data-banner-prev]').addEventListener('click', () => { go(index - 1); start(); });
  root.querySelector('[data-banner-next]').addEventListener('click', () => { go(index + 1); start(); });
  pauseButton.addEventListener('click', () => {
    userPaused = !userPaused;
    renderPause();
    start();
  });

  root.addEventListener('mouseenter', () => { hovering = true; stop(); });
  root.addEventListener('mouseleave', () => { hovering = false; start(); });
  root.addEventListener('focusin', () => { hovering = true; stop(); });
  root.addEventListener('focusout', (event) => {
    if (root.contains(event.relatedTarget)) return;
    hovering = false;
    start();
  });
  track.addEventListener('pointerdown', start);
  document.addEventListener('visibilitychange', start);

  let frame = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }, { passive: true });

  // Ao cruzar o limite celular/desktop, a lista de slides visíveis muda.
  window.matchMedia('(max-width: 767px)').addEventListener('change', () => {
    buildDots();
    start();
  });

  renderPause();
  buildDots();
  start();
}

export function initBannerCarousel() {
  document.querySelectorAll('[data-banner-carousel]').forEach(setup);
}
