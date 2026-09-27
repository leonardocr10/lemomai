/**
 * Build de produção: minifica e empacota CSS e JS com esbuild, gera nomes
 * com hash (cache imutável) e um manifest.json lido por src/utils/assets.js.
 *
 *   npm run build
 */
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'dist');

const entries = {
  'css/main.css': 'public/css/main.css',
  'js/main.js': 'public/js/main.js',
  'js/boot.js': 'public/js/boot.js',
};

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  const manifest = {};

  for (const [key, entry] of Object.entries(entries)) {
    const result = await esbuild.build({
      entryPoints: [path.join(ROOT, entry)],
      bundle: true,
      minify: true,
      sourcemap: false,
      format: key === 'js/main.js' ? 'esm' : undefined,
      target: ['es2020', 'chrome100', 'safari15', 'firefox100'],
      outdir: OUT,
      entryNames: '[name]-[hash]',
      external: ['/icons/*', '/images/*'],
      metafile: true,
      logLevel: 'warning',
    });
    const output = Object.keys(result.metafile.outputs)[0];
    manifest[key] = path.basename(output);
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Assets gerados em public/dist:', manifest);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
