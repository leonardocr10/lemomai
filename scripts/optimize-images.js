/**
 * Gera as versões otimizadas (AVIF/WebP/PNG) das imagens da marca a partir
 * dos arquivos-fonte em assets-src/.
 *
 *   npm run images
 *
 * Fontes (assets-src/):
 *   brand/logo-horizontal-cor.png     logo colorido, fundo transparente
 *   brand/logo-horizontal-branco.png  símbolo colorido + texto branco, fundo transparente
 *   brand/simbolo-cor.svg             símbolo vetorial (fundos claros)
 *   brand/simbolo-branco.svg          símbolo vetorial (fundos escuros)
 *   brand/icone-app-1024.png          ícone de app (fundo petróleo)
 *   banner.webp                       banner com notebook + celular
 *
 * Saídas:
 *   public/images/brand/logo-horizontal.*  logo colorido (fundos claros)
 *   public/images/brand/logo-dark.*        símbolo colorido + texto branco (fundos escuros)
 *   public/images/brand/logo-white.*       logo monocromático branco
 *   public/images/brand/logo-symbol.*      apenas o símbolo "L" (fundos claros)
 *   public/images/brand/logo-symbol-dark.* apenas o símbolo "L" (fundos escuros)
 *   public/images/hero/hero-devices-*.*    notebook + celular do banner
 *   public/images/og/og-default.jpg        imagem Open Graph 1200x630
 *   public/favicon-*.png, apple-touch-icon.png, icons/icon-*.png
 */
const path = require('node:path');
const fs = require('node:fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets-src');
const BRAND = path.join(SRC, 'brand');
const OUT = path.join(ROOT, 'public');

const BANNER = path.join(SRC, 'banner.webp');
// Recorte do banner só com os dispositivos (sem a headline à esquerda).
const HERO_BOX = { left: 950, top: 0, width: 1050, height: 667 };
// Fundo escuro do banner, usado para completar a imagem Open Graph.
const BANNER_BG = { r: 19, g: 54, b: 48 };

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

/** Pinta de branco todos os pixels visíveis, preservando o alfa. */
async function toWhite(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png();
}

async function writeVariants(image, basePath, width) {
  const trimmed = await image.png().toBuffer().then((buf) => sharp(buf).trim({ threshold: 0 }).png().toBuffer());
  const resized = () => sharp(trimmed).resize({ width, withoutEnlargement: true });
  await resized().png({ compressionLevel: 9, palette: true }).toFile(`${basePath}.png`);
  await resized().webp({ quality: 90, alphaQuality: 100 }).toFile(`${basePath}.webp`);
  await resized().avif({ quality: 70 }).toFile(`${basePath}.avif`);
  const { width: w, height: h } = await sharp(`${basePath}.png`).metadata();
  console.log(`${path.relative(OUT, basePath)}: ${w}x${h}`);
}

async function buildLogos() {
  const dir = path.join(OUT, 'images', 'brand');
  ensureDir(dir);

  await writeVariants(sharp(path.join(BRAND, 'logo-horizontal-cor.png')), path.join(dir, 'logo-horizontal'), 640);
  await writeVariants(sharp(path.join(BRAND, 'logo-horizontal-branco.png')), path.join(dir, 'logo-dark'), 640);
  await writeVariants(await toWhite(path.join(BRAND, 'logo-horizontal-branco.png')), path.join(dir, 'logo-white'), 640);
  await writeVariants(sharp(path.join(BRAND, 'simbolo-cor.svg'), { density: 600 }), path.join(dir, 'logo-symbol'), 320);
  await writeVariants(sharp(path.join(BRAND, 'simbolo-branco.svg'), { density: 600 }), path.join(dir, 'logo-symbol-dark'), 320);
}

async function buildIcons() {
  // Ícone de app (quadrado petróleo com o símbolo) — legível em abas claras e escuras.
  const icon = path.join(BRAND, 'icone-app-1024.png');
  ensureDir(path.join(OUT, 'icons'));
  for (const size of [16, 32, 48]) {
    await sharp(icon).resize(size, size).png().toFile(path.join(OUT, `favicon-${size}.png`));
  }
  for (const size of [192, 512]) {
    await sharp(icon).resize(size, size).png().toFile(path.join(OUT, 'icons', `icon-${size}.png`));
  }
  // Apple touch icon precisa de fundo sólido (o iOS aplica os cantos arredondados).
  await sharp(icon)
    .resize(180, 180)
    .flatten({ background: '#0f2d4a' })
    .png()
    .toFile(path.join(OUT, 'apple-touch-icon.png'));
}

async function buildHero() {
  const dir = path.join(OUT, 'images', 'hero');
  ensureDir(dir);
  const base = sharp(BANNER).extract(HERO_BOX);
  for (const width of [1100, 720]) {
    const target = path.join(dir, `hero-devices-${width}`);
    await base.clone().resize({ width }).avif({ quality: 60 }).toFile(`${target}.avif`);
    await base.clone().resize({ width }).webp({ quality: 80 }).toFile(`${target}.webp`);
    await base.clone().resize({ width }).jpeg({ quality: 82, mozjpeg: true }).toFile(`${target}.jpg`);
  }
}

async function buildOgImage() {
  const dir = path.join(OUT, 'images', 'og');
  ensureDir(dir);
  await sharp(BANNER)
    .resize(1200, 630, { fit: 'contain', background: { ...BANNER_BG, alpha: 1 } })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(path.join(dir, 'og-default.jpg'));
}

(async () => {
  await buildLogos();
  await buildIcons();
  await buildHero();
  await buildOgImage();
  console.log('Imagens geradas em public/.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
