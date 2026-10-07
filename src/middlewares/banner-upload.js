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

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: FIELDS.length, fields: 20, fieldSize: 20 * 1024 },
}).fields(FIELDS.map((name) => ({ name, maxCount: 1 })));

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

function bannerUpload(req, res, next) {
  upload(req, res, (err) => {
    req.uploadErrors = req.uploadErrors || {};
    if (err instanceof multer.MulterError) {
      discardUploads(req);
      req.uploadErrors[err.field || 'image'] =
        err.code === 'LIMIT_FILE_SIZE' ? 'A imagem deve ter no máximo 5 MB.' : 'Envio de arquivo inválido.';
      return next();
    }
    if (err) return next(err);
    for (const [field, [file]] of Object.entries(req.files || {})) {
      if (hasImageSignature(file.path)) continue;
      fs.rmSync(file.path, { force: true });
      delete req.files[field];
      req.uploadErrors[field] = 'Arquivo de imagem inválido. Use JPG, PNG ou WebP.';
    }
    return next();
  });
}

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

module.exports = { bannerUpload, verifyCsrfAfterUpload, discardUploads, uploadedUrl, removeUploadedFile };
