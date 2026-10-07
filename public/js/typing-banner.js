/**
 * "Lenom.AI" digitado como máquina de escrever (logo do topo do site e banner
 * do login). O HTML já traz o nome completo, que aparece sem JS.
 * Ciclo: 0,7 s vazio → "Lenom" (110–220 ms/letra) → pausa 380 ms → ".AI"
 * → 3,2 s parado → apaga a 55 ms/letra → recomeça.
 */
(function () {
  const NAME = 'Lenom';
  const SUFFIX = '.AI';
  const TOTAL = NAME.length + SUFFIX.length;

  function startTypingBanner(root) {
    const lenom = root.querySelector('[data-typed-lenom]');
    const ai = root.querySelector('[data-typed-ai]');
    const cursor = root.querySelector('[data-cursor]');
    let token = 0;
    let timer = null;

    const render = (count) => {
      lenom.textContent = NAME.slice(0, Math.min(count, NAME.length));
      ai.textContent = SUFFIX.slice(0, Math.max(0, count - NAME.length));
    };
    const typing = (on) => cursor.classList.toggle('is-typing', on);
    const wait = (ms, run) => new Promise((resolve) => {
      timer = setTimeout(() => resolve(run === token), ms);
    });
    const randomDelay = () => 110 + Math.random() * 110;

    async function loop() {
      const run = ++token;
      clearTimeout(timer);
      for (;;) {
        render(0);
        typing(false);
        if (!(await wait(700, run))) return;
        typing(true);
        for (let i = 1; i <= NAME.length; i++) {
          if (!(await wait(randomDelay(), run))) return;
          render(i);
        }
        typing(false);
        if (!(await wait(380, run))) return;
        typing(true);
        for (let i = NAME.length + 1; i <= TOTAL; i++) {
          if (!(await wait(randomDelay(), run))) return;
          render(i);
        }
        typing(false);
        if (!(await wait(3200, run))) return;
        typing(true);
        for (let i = TOTAL - 1; i >= 0; i--) {
          if (!(await wait(55, run))) return;
          render(i);
        }
      }
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      render(TOTAL);
      return { restart() { render(TOTAL); } };
    }
    loop();
    return { restart: loop };
  }

  window.startTypingBanner = startTypingBanner;
  document.querySelectorAll('[data-typing-banner]').forEach((root) => startTypingBanner(root));
}());
