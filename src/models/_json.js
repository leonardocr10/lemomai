/**
 * Coluna JSON tolerante: MySQL devolve objeto, MariaDB devolve string.
 * O getter normaliza para sempre entregar o valor já convertido.
 */
module.exports = (DataTypes, name, fallback = null) => ({
  type: DataTypes.JSON,
  allowNull: true,
  get() {
    const raw = this.getDataValue(name);
    if (typeof raw !== 'string') return raw ?? fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
});
