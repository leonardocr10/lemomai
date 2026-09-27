/**
 * Ponto de entrada do front-end. Cada módulo é independente e só age se
 * encontrar seus elementos (data-*) na página.
 */
import { initHeader } from './modules/header.js';
import { initReveal } from './modules/reveal.js';
import { initAccordion } from './modules/accordion.js';
import { initCarousel } from './modules/carousel.js';
import { initForms } from './modules/forms.js';
import { initCookies } from './modules/cookies.js';

const modules = [initHeader, initReveal, initAccordion, initCarousel, initForms, initCookies];

for (const init of modules) {
  try {
    init();
  } catch (error) {
    console.error(`[lc] falha ao iniciar ${init.name}`, error);
  }
}
