/**
 * Galeria de imagens do painel. Toda imagem enviada (pelo cadastro de banner
 * ou direto na galeria) é registrada aqui e pode ser reaproveitada.
 */
const repositories = require('../repositories');
const { imageSizeFromFile } = require('../utils/image-size');
const { removeUploadedFile } = require('../middlewares/banner-upload');

/** Registra arquivos recém-enviados (de uploadedFiles) e devolve os registros. */
async function register(files) {
  const saved = [];
  for (const file of files) {
    const existing = await repositories.media.findByUrl(file.url);
    if (existing) {
      saved.push(existing);
      continue;
    }
    const dims = imageSizeFromFile(file.path) || {};
    saved.push(await repositories.media.create({
      url: file.url,
      name: file.name,
      width: dims.width ?? null,
      height: dims.height ?? null,
      size: file.size ?? null,
      mime: file.mime ?? null,
    }));
  }
  return saved;
}

/** Imagem da galeria escolhida num formulário: só vale se estiver registrada. */
async function findByUrl(url) {
  if (typeof url !== 'string' || !url.startsWith('/')) return null;
  return repositories.media.findByUrl(url);
}

/**
 * Exclui da galeria. Bloqueado se algum banner usa a imagem. Arquivos enviados
 * pelo painel (/uploads) são apagados; os de exemplo (/images) ficam no disco.
 */
async function remove(id) {
  const item = await repositories.media.findById(id);
  if (!item) return { ok: false, reason: 'not-found' };
  const usage = await repositories.media.usageCount(item.url);
  if (usage > 0) return { ok: false, reason: 'in-use', usage, item };
  await repositories.media.remove(item.id);
  removeUploadedFile(item.url);
  return { ok: true, item };
}

module.exports = { register, findByUrl, remove };
