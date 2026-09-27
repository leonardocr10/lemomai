/**
 * Resolve caminhos de CSS/JS. Em produção, se `npm run build` gerou
 * public/dist/manifest.json, usa os arquivos minificados com hash
 * (cache longo). Caso contrário, usa os fontes com ?v=versão.
 */
const fs = require('node:fs');
const path = require('node:path');
const config = require('../config');
const { version } = require('../../package.json');

const MANIFEST = path.resolve(__dirname, '../../public/dist/manifest.json');
let manifest = null;

function loadManifest() {
  if (manifest !== null) return manifest;
  try {
    manifest = config.isProduction ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  } catch {
    manifest = {};
  }
  return manifest;
}

/** asset('css/main.css') -> '/dist/main-3F2A.css' ou '/css/main.css?v=1.0.0' */
function asset(file) {
  const built = loadManifest()[file];
  return built ? `/dist/${built}` : `/${file}?v=${version}`;
}

module.exports = { asset };
