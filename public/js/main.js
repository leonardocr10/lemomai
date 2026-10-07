/**
 * Ponto de entrada do front-end. Cada módulo é independente e só age se
 * encontrar seus elementos (data-*) na página.
 */
import { initHeader } from './modules/header.js';
import { initReveal } from './modules/reveal.js';
import { initAccordion } from './modules/accordion.js';
import { initCarousel } from './modules/carousel.js';
import { initBannerCarousel } from './modules/banner-carousel.js';
import { initForms } from './modules/forms.js';
import { initCookies } from './modules/cookies.js';
import { initBackToTop } from './modules/back-to-top.js';

const modules = [initHeader, initReveal, initAccordion, initCarousel, initBannerCarousel, initForms, initCookies, initBackToTop];

for (const init of modules) {
  try {
    init();
  } catch (error) {
    console.error(`[lenom] falha ao iniciar ${init.name}`, error);
  }
}
