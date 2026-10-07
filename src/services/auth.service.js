/**
 * Autenticação do painel: um único admin, senha com scrypt (node:crypto)
 * e sessões com token aleatório guardadas no banco interno.
 */
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const config = require('../config');
const repositories = require('../repositories');
const logger = require('../utils/logger');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const SESSION_TTL = 8 * 60 * 60 * 1000;
// Hash descartável: mantém o tempo de resposta igual quando o usuário não existe.
let dummyHash = null;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(password), salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(password, stored) {
  const [algorithm, salt, key] = String(stored || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64');
  const actual = await scrypt(String(password), Buffer.from(salt, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

/**
 * Cria o admin na primeira execução. Em produção exige ADMIN_PASSWORD;
 * em desenvolvimento usa a senha "admin" com aviso. Retorna false se o
 * painel deve ficar desativado.
 */
async function ensureAdminUser() {
  if (await repositories.admin.getUser()) return true;
  const { user } = config.admin;
  let { password } = config.admin;
  if (!password) {
    if (config.isProduction) {
      logger.warn('Painel /admin desativado: defina ADMIN_PASSWORD no .env para criar o administrador.');
      return false;
    }
    password = 'admin';
    logger.warn(`Admin criado com usuário "${user}" e senha "admin" (somente desenvolvimento). Troque a senha no painel.`);
  }
  await repositories.admin.setUser(user, await hashPassword(password));
  return true;
}

async function createSession() {
  const session = { id: crypto.randomBytes(32).toString('base64url'), expiresAt: Date.now() + SESSION_TTL };
  await repositories.admin.createSession(session.id, session.expiresAt);
  return session;
}

async function login(username, password) {
  const user = await repositories.admin.getUser();
  if (!user || user.username !== username) {
    dummyHash = dummyHash || (await hashPassword('dummy'));
    await verifyPassword(password, dummyHash);
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return createSession();
}

async function getSession(id) {
  if (!id || typeof id !== 'string') return null;
  const session = await repositories.admin.findSession(id);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    await repositories.admin.deleteSession(id);
    return null;
  }
  return session;
}

async function logout(id) {
  if (id) await repositories.admin.deleteSession(id);
}

/** Troca a senha e encerra as outras sessões abertas. */
async function changePassword(sessionId, currentPassword, newPassword) {
  const user = await repositories.admin.getUser();
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return false;
  await repositories.admin.setUser(user.username, await hashPassword(newPassword));
  await repositories.admin.deleteOtherSessions(sessionId);
  return true;
}

module.exports = { hashPassword, verifyPassword, ensureAdminUser, login, getSession, logout, changePassword, SESSION_TTL };
