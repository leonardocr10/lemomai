/**
 * Upload das imagens dos banners (painel). Ficam em public/uploads/banners
 * porque são exibidas no site. Só JPG/PNG/WebP até 5 MB, e a assinatura do
 * arquivo é conferida (não basta a extensão). Erros viram req.uploadErrors
 * por campo, exibidos no formulário.
 */
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const multer = require('multer');
const { verifyCsrf } = require('./csrf');

const UPLOAD_DIR = path.resolve(__dirname, '../../public/uploads/banners');
const URL_PREFIX = '/uploads/banners/';
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const FIELDS = ['image', 'mobileImage'];

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (TYPES[ext] && TYPES[ext] === file.mimetype) return cb(null, true);
  req.uploadErrors = { ...req.uploadErrors, [file.fieldname]: 'Use uma imagem JPG, PNG ou WebP.' };
  return cb(null, false);
}

const GALLERY_MAX_FILES = 10;

function multerFor(fields) {
  const files = fields.reduce((total, field) => total + field.maxCount, 0);
  return multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_BYTES, files, fields: 20, fieldSize: 20 * 1024 },
  }).fields(fields);
}

function hasImageSignature(filePath) {
  const header = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, header, 0, header.length, 0);
  } finally {
    fs.closeSync(fd);
  }
  const jpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const png = header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
  return jpeg || png || webp;
}

/** Apaga os arquivos recebidos nesta requisição (validação falhou, CSRF inválido...). */
function discardUploads(req) {
  for (const files of Object.values(req.files || {})) {
    for (const file of files) fs.rmSync(file.path, { force: true });
  }
  req.files = {};
}

/** Middleware de upload para os campos dados; confere a assinatura de cada arquivo. */
function uploader(fields, defaultField) {
  const upload = multerFor(fields);
  return (req, res, next) => {
    upload(req, res, (err) => {
      req.uploadErrors = req.uploadErrors || {};
      if (err instanceof multer.MulterError) {
        discardUploads(req);
        const messages = {
          LIMIT_FILE_SIZE: 'Cada imagem deve ter no máximo 5 MB.',
          LIMIT_FILE_COUNT: `Envie no máximo ${GALLERY_MAX_FILES} imagens por vez.`,
        };
        req.uploadErrors[err.field || defaultField] = messages[err.code] || 'Envio de arquivo inválido.';
        return next();
      }
      if (err) return next(err);
      for (const [field, files] of Object.entries(req.files || {})) {
        const valid = files.filter((file) => {
          if (hasImageSignature(file.path)) return true;
          fs.rmSync(file.path, { force: true });
          req.uploadErrors[field] = 'Arquivo de imagem inválido. Use JPG, PNG ou WebP.';
          return false;
        });
        if (valid.length) req.files[field] = valid;
        else delete req.files[field];
      }
      return next();
    });
  };
}

/** Formulário de banner: imagem principal e imagem de celular. */
const bannerUpload = uploader(FIELDS.map((name) => ({ name, maxCount: 1 })), 'image');

/** Galeria: várias imagens de uma vez no campo "files". */
const galleryUpload = uploader([{ name: 'files', maxCount: GALLERY_MAX_FILES }], 'files');

/** CSRF conferido depois do multer (o token vem no corpo multipart); descarta os arquivos se falhar. */
function verifyCsrfAfterUpload(req, res, next) {
  verifyCsrf(req, res, (err) => {
    if (err) discardUploads(req);
    next(err);
  });
}

/** URL pública do arquivo enviado no campo, ou null. */
function uploadedUrl(req, field) {
  const file = req.files?.[field]?.[0];
  return file ? URL_PREFIX + file.filename : null;
}

/** Apaga um arquivo de banner enviado pelo painel (imagens iniciais em /images não são tocadas). */
function removeUploadedFile(url) {
  if (typeof url !== 'string' || !url.startsWith(URL_PREFIX)) return;
  fs.rmSync(path.join(UPLOAD_DIR, path.basename(url)), { force: true });
}

/** Arquivos aceitos na requisição (para registrar na galeria). */
function uploadedFiles(req, field) {
  return (req.files?.[field] || []).map((file) => ({
    url: URL_PREFIX + file.filename,
    path: file.path,
    name: file.originalname,
    size: file.size,
    mime: file.mimetype,
  }));
}

module.exports = {
  bannerUpload,
  galleryUpload,
  verifyCsrfAfterUpload,
  discardUploads,
  uploadedUrl,
  uploadedFiles,
  removeUploadedFile,
  GALLERY_MAX_FILES,
};
