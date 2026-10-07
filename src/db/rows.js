/**
 * Conversão entre objetos da aplicação (camelCase) e linhas SQLite
 * (snake_case, booleanos como 0/1, listas como JSON).
 */
const toSnake = (key) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
const toCamel = (key) => key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());

/** Só colunas declaradas em def.columns entram no SQL — nomes nunca vêm do usuário. */
function encodeRow(def, data) {
  return def.columns
    .filter((key) => data[key] !== undefined)
    .map((key) => {
      let value = data[key];
      if (def.json?.includes(key)) value = JSON.stringify(value ?? []);
      else if (def.bool?.includes(key)) value = value ? 1 : 0;
      return [toSnake(key), value ?? null];
    });
}

function decodeRow(def, row) {
  if (!row) return null;
  const item = {};
  for (const [column, value] of Object.entries(row)) {
    const key = toCamel(column);
    if (def.json?.includes(key)) item[key] = JSON.parse(value || '[]');
    else if (def.bool?.includes(key)) item[key] = Boolean(value);
    else item[key] = value;
  }
  return item;
}

module.exports = { toSnake, toCamel, encodeRow, decodeRow };
