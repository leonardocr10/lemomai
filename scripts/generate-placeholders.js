/**
 * Gera ilustrações SVG (mockups de tela) usadas como capas/screenshots do
 * portfólio enquanto não houver prints reais. Substitua os arquivos em
 * public/images/portfolio/ pelos screenshots definitivos quando existirem.
 *
 *   npm run placeholders
 */
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.resolve(__dirname, '../public/images/portfolio');
const C = {
  navy: '#061a3a',
  deep: '#03112a',
  soft: '#0b2a5c',
  primary: '#0b7cff',
  cyan: '#00d8ff',
  white: '#ffffff',
  bg: '#f6f9ff',
  line: '#dce6f4',
  muted: '#94a3b8',
  text: '#10213f',
  green: '#16a34a',
  greenTint: '#dcfce7',
  amber: '#d97706',
  amberTint: '#fef3c7',
  blueTint: '#e6f1ff',
};

const W = 1600;
const H = 1000;

const rect = (x, y, w, h, fill, r = 12, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const text = (x, y, value, size, fill, weight = 700, anchor = 'start') =>
  `<text x="${x}" y="${y}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${value}</text>`;
const bar = (x, y, w, fill = C.line, h = 14) => rect(x, y, w, h, fill, h / 2);

function frame(content, { title }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">
  <defs>
    <radialGradient id="glow" cx="75%" cy="20%" r="80%">
      <stop offset="0" stop-color="${C.primary}" stop-opacity=".55"/>
      <stop offset="1" stop-color="${C.navy}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${C.cyan}"/>
      <stop offset="1" stop-color="${C.primary}"/>
    </linearGradient>
    <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${C.primary}" stop-opacity=".35"/>
      <stop offset="1" stop-color="${C.primary}" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#000" flood-opacity=".35"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.navy}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <path d="M-20 820 C 300 720, 520 960, 860 820 S 1360 600, 1640 700" stroke="${C.cyan}" stroke-opacity=".5" stroke-width="3" fill="none"/>
  <g filter="url(#shadow)">
    ${rect(110, 90, 1380, 820, C.white, 22)}
    ${rect(110, 90, 1380, 56, '#eef3fb', 22)}
    ${rect(110, 124, 1380, 22, '#eef3fb', 0)}
    <circle cx="146" cy="118" r="8" fill="#ff5f57"/><circle cx="172" cy="118" r="8" fill="#febc2e"/><circle cx="198" cy="118" r="8" fill="#28c840"/>
    ${rect(520, 104, 560, 28, C.white, 14)}
  </g>
  <g transform="translate(110 146)">${content}</g>
</svg>`;
}

// ------------------------------------------------------------- templates
function ecommerce() {
  const cube = (x, y, s, c1, c2) => `<g transform="translate(${x} ${y})">
    <polygon points="0,${s * 0.3} ${s * 0.5},0 ${s},${s * 0.3} ${s * 0.5},${s * 0.6}" fill="${c2}"/>
    <polygon points="0,${s * 0.3} ${s * 0.5},${s * 0.6} ${s * 0.5},${s * 1.1} 0,${s * 0.8}" fill="${c1}"/>
    <polygon points="${s},${s * 0.3} ${s * 0.5},${s * 0.6} ${s * 0.5},${s * 1.1} ${s},${s * 0.8}" fill="${C.primary}"/>
  </g>`;
  const products = [0, 1, 2, 3]
    .map((i) => {
      const x = 60 + i * 318;
      return `${rect(x, 300, 290, 400, C.bg, 16)}
      ${rect(x + 20, 320, 250, 220, C.blueTint, 12)}
      ${cube(x + 85, 350, 120, C.soft, C.cyan)}
      ${bar(x + 20, 566, 180, C.text, 16)}
      ${bar(x + 20, 598, 120)}
      ${text(x + 20, 660, `R$ ${[89, 149, 59, 219][i]},90`, 28, C.primary, 800)}
      ${rect(x + 196, 630, 74, 44, 'url(#grad)', 10)}`;
    })
    .join('');
  return `${rect(0, 0, 1380, 90, C.white, 0)}
    ${text(60, 58, 'Cassiano3D', 34, C.navy, 800)}
    ${bar(420, 38, 90, C.muted)}${bar(540, 38, 90, C.muted)}${bar(660, 38, 90, C.muted)}
    ${rect(1150, 24, 170, 44, 'url(#grad)', 22)}${text(1235, 53, 'Carrinho', 18, C.white, 700, 'middle')}
    ${rect(60, 120, 1260, 150, C.navy, 18)}
    ${text(100, 190, 'Produtos 3D personalizados', 42, C.white, 800)}
    ${bar(100, 220, 380, C.cyan, 14)}
    ${cube(1120, 130, 120, C.soft, C.cyan)}
    ${products}`;
}

function dashboard(brand) {
  const kpi = (x, label, value, color) => `${rect(x, 110, 250, 130, C.white, 14, `stroke="${C.line}"`)}
    ${text(x + 24, 150, label, 18, C.muted, 600)}${text(x + 24, 205, value, 38, color, 800)}`;
  const points = [0, 60, 40, 110, 90, 150, 130, 210, 190, 260];
  const path = points.map((y, i) => `${i ? 'L' : 'M'}${420 + i * 60} ${560 - y}`).join(' ');
  return `${rect(0, 0, 260, 764, C.navy, 0)}
    ${text(36, 64, brand, 26, C.white, 800)}
    ${rect(24, 100, 212, 48, C.primary, 10)}${text(48, 131, 'Dashboard', 18, C.white, 700)}
    ${['Clientes', 'Projetos', 'Financeiro', 'Relatórios', 'Configurações'].map((l, i) => text(48, 196 + i * 56, l, 18, '#a9bddc', 500)).join('')}
    ${rect(260, 0, 1120, 764, C.bg, 0)}
    ${kpi(300, 'Receita', 'R$ 24.960', C.text)}${kpi(570, 'Clientes', '125', C.text)}${kpi(840, 'Projetos', '18', C.text)}${kpi(1110, 'Crescimento', '+32%', C.green)}
    ${rect(300, 270, 560, 440, C.white, 14, `stroke="${C.line}"`)}
    ${text(330, 312, 'Desempenho', 22, C.text, 800)}
    <path d="${path} L 960 680 L 420 680 Z" fill="url(#area)" transform="translate(-90 0)"/>
    <path d="${path}" stroke="${C.primary}" stroke-width="5" fill="none" transform="translate(-90 0)"/>
    ${rect(890, 270, 450, 440, C.white, 14, `stroke="${C.line}"`)}
    ${text(920, 312, 'Projetos recentes', 22, C.text, 800)}
    ${[['Concluído', C.greenTint, C.green], ['Em andamento', C.blueTint, C.primary], ['Em revisão', C.amberTint, C.amber], ['Concluído', C.greenTint, C.green]]
      .map(([label, bg, fg], i) => `${bar(920, 366 + i * 82, 200, C.text, 14)}${bar(920, 392 + i * 82, 130)}${rect(1180, 360 + i * 82, 132, 36, bg, 18)}${text(1246, 384 + i * 82, label, 14, fg, 700, 'middle')}`)
      .join('')}`;
}

function listView() {
  const rows = [
    ['Site Institucional', 'Concluído', C.greenTint, C.green],
    ['Sistema Administrativo', 'Em andamento', C.blueTint, C.primary],
    ['Landing Page', 'Em revisão', C.amberTint, C.amber],
    ['Loja Virtual', 'Concluído', C.greenTint, C.green],
    ['Integração ERP', 'Em andamento', C.blueTint, C.primary],
    ['App de Pedidos', 'Concluído', C.greenTint, C.green],
  ];
  return `${rect(0, 0, 1380, 764, C.bg, 0)}
    ${text(60, 76, 'Projetos', 36, C.text, 800)}
    ${rect(1100, 40, 220, 52, 'url(#grad)', 12)}${text(1210, 73, '+ Novo projeto', 18, C.white, 700, 'middle')}
    ${rect(60, 120, 1260, 600, C.white, 16, `stroke="${C.line}"`)}
    ${['Projeto', 'Cliente', 'Prazo', 'Status'].map((h, i) => text(100 + [0, 440, 760, 1000][i], 170, h, 16, C.muted, 700)).join('')}
    ${rows
      .map(([name, status, bg, fg], i) => {
        const y = 210 + i * 84;
        return `<line x1="80" x2="1300" y1="${y - 20}" y2="${y - 20}" stroke="${C.line}"/>
        ${text(100, y + 20, name, 20, C.text, 700)}${bar(540, y + 6, 180)}${bar(860, y + 6, 100)}
        ${rect(1100, y - 4, 150, 38, bg, 19)}${text(1175, y + 21, status, 15, fg, 700, 'middle')}`;
      })
      .join('')}`;
}

function website() {
  return `${rect(0, 0, 1380, 90, C.white, 0)}
    ${rect(60, 26, 150, 40, C.navy, 8)}
    ${bar(700, 38, 80, C.muted)}${bar(810, 38, 80, C.muted)}${bar(920, 38, 80, C.muted)}
    ${rect(1150, 22, 170, 48, C.primary, 10)}
    ${rect(0, 90, 1380, 380, C.navy, 0)}
    ${text(80, 210, 'Soluções que geram', 54, C.white, 800)}
    ${text(80, 280, 'confiança', 54, C.cyan, 800)}
    ${bar(80, 318, 460, '#a9bddc', 16)}${bar(80, 348, 380, '#a9bddc', 16)}
    ${rect(80, 390, 200, 56, 'url(#grad)', 12)}
    ${rect(760, 130, 560, 300, C.soft, 18)}
    <circle cx="1040" cy="280" r="90" fill="url(#grad)" opacity=".85"/>
    ${[0, 1, 2]
      .map((i) => {
        const x = 80 + i * 420;
        return `${rect(x, 520, 380, 200, C.white, 16, `stroke="${C.line}"`)}${rect(x + 28, 548, 56, 56, C.blueTint, 12)}${bar(x + 28, 630, 220, C.text, 16)}${bar(x + 28, 662, 300)}${bar(x + 28, 688, 240)}`;
      })
      .join('')}`;
}

function landing() {
  return `${rect(0, 0, 1380, 764, C.deep, 0)}
    <circle cx="1150" cy="120" r="320" fill="${C.primary}" opacity=".25"/>
    ${rect(80, 60, 140, 36, C.white, 8, 'opacity=".9"')}
    ${text(80, 230, 'Oferta especial', 26, C.cyan, 700)}
    ${text(80, 310, 'Transforme visitas', 62, C.white, 800)}
    ${text(80, 385, 'em clientes', 62, C.white, 800)}
    ${bar(80, 430, 520, '#a9bddc', 16)}${bar(80, 462, 440, '#a9bddc', 16)}
    ${rect(80, 520, 300, 68, 'url(#grad)', 14)}${text(230, 563, 'Quero saber mais', 22, C.white, 800, 'middle')}
    ${rect(860, 150, 440, 480, C.white, 22)}
    ${text(900, 214, 'Fale com a gente', 28, C.text, 800)}
    ${[0, 1, 2].map((i) => rect(900, 250 + i * 86, 360, 60, C.bg, 10, `stroke="${C.line}"`)).join('')}
    ${rect(900, 520, 360, 64, C.primary, 12)}${text(1080, 560, 'Enviar', 22, C.white, 800, 'middle')}`;
}

const files = {
  'cassiano3d-cover.svg': frame(ecommerce(), { title: 'Loja virtual Cassiano3D' }),
  'cassiano3d-admin.svg': frame(dashboard('Cassiano3D'), { title: 'Painel administrativo Cassiano3D' }),
  'sistema-administrativo-cover.svg': frame(dashboard('LC Gestão'), { title: 'Dashboard do sistema administrativo' }),
  'sistema-administrativo-list.svg': frame(listView(), { title: 'Listagem de projetos' }),
  'site-institucional-cover.svg': frame(website(), { title: 'Site institucional' }),
  'landing-page-cover.svg': frame(landing(), { title: 'Landing page de conversão' }),
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), svg.replace(/\n\s+/g, '\n'));
}
console.log(`${Object.keys(files).length} ilustrações geradas em public/images/portfolio/`);
