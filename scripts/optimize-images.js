/**
 * Gera as versões otimizadas (AVIF/WebP/PNG) das imagens da marca a partir
 * dos arquivos-fonte em assets-src/.
 *
 *   npm run images
 *
 * Saídas:
 *   public/images/brand/logo-horizontal.*  logo colorido (fundos claros)
 *   public/images/brand/logo-dark.*        símbolo colorido + texto branco (fundos escuros)
 *   public/images/brand/logo-white.*       logo monocromático branco
 *   public/images/brand/logo-symbol.*      apenas o símbolo "LC"
 *   public/images/hero/hero-devices-*.*    notebook + celular do banner
 *   public/images/og/og-default.jpg        imagem Open Graph 1200x630
 *   public/favicon-*.png, apple-touch-icon.png, icons/icon-*.png
 */
const path = require('node:path');
const fs = require('node:fs');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets-src');
const OUT = path.join(ROOT, 'public');

const LOGO_BOX = { left: 96, top: 350, width: 1290, height: 380 };
const SYMBOL_BOX = { left: 96, top: 350, width: 550, height: 380 };
// Área do texto "LC Serviços" dentro do recorte do logo.
const TEXT_AREA = { x: 520 - LOGO_BOX.left, y: 500 - LOGO_BOX.top };
const HERO_BOX = { left: 1060, top: 0, width: 1095, height: 730 };
const NAVY = { r: 6, g: 26, b: 58 };

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

/**
 * Remove o fundo branco conectado às bordas (flood fill), preservando os
 * brancos internos do símbolo (trilhas e nós do circuito). Os pixels de borda
 * recebem "color to alpha" para manter o antisserrilhado.
 */
function removeWhiteBackground(data, width, height, textArea) {
  const isLight = (i) => data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200;
  const bg = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);

  while (stack.length) {
    const p = stack.pop();
    if (bg[p] || !isLight(p * 4)) continue;
    bg[p] = 1;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }

  // Faixa de 2px ao redor do fundo para suavizar as bordas.
  const fringe = new Uint8Array(bg);
  for (let pass = 0; pass < 2; pass++) {
    const snapshot = new Uint8Array(fringe);
    for (let p = 0; p < width * height; p++) {
      if (snapshot[p]) continue;
      const x = p % width;
      if ((x > 0 && snapshot[p - 1]) || (x < width - 1 && snapshot[p + 1]) ||
          snapshot[p - width] || snapshot[p + width]) {
        fringe[p] = 2;
      }
    }
  }

  // Na área do texto não há brancos intencionais: libera também o miolo das letras (o, e, ç).
  for (let y = textArea.y; y < height; y++) {
    for (let x = textArea.x; x < width; x++) fringe[y * width + x] = 2;
  }

  for (let p = 0; p < width * height; p++) {
    if (!fringe[p]) continue;
    const i = p * 4;
    const alpha = Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]) / 255;
    if (alpha <= 0.02) {
      data[i + 3] = 0;
      continue;
    }
    for (let c = 0; c < 3; c++) {
      data[i + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - 255 * (1 - alpha)) / alpha)));
    }
    data[i + 3] = Math.round(alpha * 255);
  }
  return data;
}

async function transparentLogo() {
  const { data, info } = await sharp(path.join(SRC, 'logo.png'))
    .extract(LOGO_BOX)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  removeWhiteBackground(data, info.width, info.height, TEXT_AREA);
  return { data, info };
}

// Texto do logo é azul-marinho; o símbolo usa azuis claros/ciano.
const isNavyText = (data, i) => data[i + 2] < 150 && data[i] + data[i + 1] + data[i + 2] < 260;

function recolor(source, info, { color, onlyText = false }) {
  const data = Buffer.from(source);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (data[i + 3] === 0) continue;
      if (onlyText && (x < TEXT_AREA.x || !isNavyText(data, i))) continue;
      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
    }
  }
  return data;
}

const rawImage = (data, info) =>
  sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });

async function writeVariants(image, basePath, width) {
  const resized = () => image.clone().resize({ width, withoutEnlargement: true }).trim({ threshold: 0 });
  await resized().png({ compressionLevel: 9, palette: true }).toFile(`${basePath}.png`);
  await resized().webp({ quality: 90, alphaQuality: 100 }).toFile(`${basePath}.webp`);
  await resized().avif({ quality: 70 }).toFile(`${basePath}.avif`);
}

async function buildLogos() {
  const dir = path.join(OUT, 'images', 'brand');
  ensureDir(dir);
  const { data, info } = await transparentLogo();

  await writeVariants(rawImage(data, info), path.join(dir, 'logo-horizontal'), 640);
  await writeVariants(
    rawImage(recolor(data, info, { onlyText: true, color: { r: 255, g: 255, b: 255 } }), info),
    path.join(dir, 'logo-dark'), 640,
  );
  await writeVariants(
    rawImage(recolor(data, info, { color: { r: 255, g: 255, b: 255 } }), info),
    path.join(dir, 'logo-white'), 640,
  );

  // Símbolo: remove o texto (pixels azul-marinho na área do texto).
  const symbolData = Buffer.from(data);
  for (let y = TEXT_AREA.y; y < info.height; y++) {
    for (let x = TEXT_AREA.x; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (isNavyText(symbolData, i)) symbolData[i + 3] = 0;
    }
  }
  const symbolRaw = await rawImage(symbolData, info)
    .extract({ left: 0, top: 0, width: SYMBOL_BOX.width, height: SYMBOL_BOX.height })
    .png()
    .toBuffer();
  await writeVariants(sharp(symbolRaw), path.join(dir, 'logo-symbol'), 320);

  // Favicons: símbolo centralizado em quadrado transparente.
  const square = await sharp(symbolRaw)
    .trim({ threshold: 0 })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  ensureDir(path.join(OUT, 'icons'));
  for (const size of [16, 32, 48]) {
    await sharp(square).resize(size, size).png().toFile(path.join(OUT, `favicon-${size}.png`));
  }
  for (const size of [192, 512]) {
    await sharp(square).resize(size, size).png().toFile(path.join(OUT, 'icons', `icon-${size}.png`));
  }
  // Apple touch icon precisa de fundo sólido.
  await sharp(square)
    .resize(150, 150)
    .extend({ top: 15, bottom: 15, left: 15, right: 15, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(path.join(OUT, 'apple-touch-icon.png'));
}

async function buildHero() {
  const dir = path.join(OUT, 'images', 'hero');
  ensureDir(dir);
  const base = sharp(path.join(SRC, 'banner.png')).extract(HERO_BOX);
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
  await sharp(path.join(SRC, 'banner.png'))
    .resize(1200, 630, { fit: 'contain', background: { ...NAVY, alpha: 1 } })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(path.join(dir, 'og-default.jpg'));
}

(async () => {
  await buildLogos();
  await buildHero();
  await buildOgImage();
  console.log('Imagens geradas em public/.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
