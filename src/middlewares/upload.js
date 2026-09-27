/**
 * Upload do anexo do orçamento. Os arquivos ficam em storage/uploads
 * (fora de public/) para não ficarem acessíveis publicamente.
 */
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');
const multer = require('multer');
const config = require('../config');
const forms = require('../config/forms');

const UPLOAD_DIR = path.resolve(__dirname, '../../storage/uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const allowedExtensions = forms.attachment.accept.split(',');

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext) && forms.attachment.mimeTypes.includes(file.mimetype)) return cb(null, true);
  const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
  error.message = 'Formato de arquivo não permitido.';
  return cb(error);
}

const quoteUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.limits.uploadMaxBytes, files: 1, fields: 30, fieldSize: 20 * 1024 },
}).single('attachment');

/**
 * Envolve o multer para transformar erros de upload em erro de validação
 * do campo "attachment", em vez de erro 500.
 */
function handleQuoteUpload(req, res, next) {
  quoteUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const maxMb = Math.round(config.limits.uploadMaxBytes / 1024 / 1024);
      req.uploadError =
        err.code === 'LIMIT_FILE_SIZE' ? `O arquivo deve ter no máximo ${maxMb} MB.` : err.message || 'Anexo inválido.';
      return next();
    }
    return next(err);
  });
}

/** Remove o arquivo enviado quando a validação do formulário falha. */
function discardUpload(file) {
  if (file?.path) fs.promises.unlink(file.path).catch(() => {});
}

module.exports = { handleQuoteUpload, discardUpload, UPLOAD_DIR };
