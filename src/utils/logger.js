/**
 * Logger simples com níveis. Erros também são gravados em storage/logs/error.log.
 * Pode ser trocado por pino/winston sem alterar quem o utiliza.
 */
const fs = require('node:fs');
const path = require('node:path');

const LOG_DIR = path.resolve(__dirname, '../../storage/logs');
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = LEVELS[process.env.LOG_LEVEL] || (process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug);

fs.mkdirSync(LOG_DIR, { recursive: true });
const errorStream = fs.createWriteStream(path.join(LOG_DIR, 'error.log'), { flags: 'a' });

function serialize(meta) {
  if (!meta) return '';
  if (meta instanceof Error) return `\n${meta.stack || meta.message}`;
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ` ${String(meta)}`;
  }
}

function write(level, message, meta) {
  if (LEVELS[level] < minLevel) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${message}${serialize(meta)}`;
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
  if (level === 'error') errorStream.write(`${line}\n`);
}

module.exports = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
