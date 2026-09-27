/**
 * Cache em memória com TTL para dados pouco mutáveis (configurações da
 * empresa, seções). Em modo MySQL evita uma consulta por requisição.
 */
const store = new Map();

async function remember(key, ttlMs, loader) {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = await loader();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

/** Invalida uma chave (ou tudo) — usar quando o painel admin salvar alterações. */
function forget(key) {
  if (key) store.delete(key);
  else store.clear();
}

module.exports = { remember, forget };
