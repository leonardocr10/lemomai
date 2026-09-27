/**
 * Formatadores usados pelas views (expostos em res.locals.fmt).
 */
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const currency = (value) => currencyFormatter.format(Number(value) || 0);

/**
 * Quebra o preço do plano em partes para exibição:
 *   { prefix: 'A partir de', amount: 'R$ 1.290', suffix: '' }
 *   { prefix: '', amount: 'R$ 199', suffix: '/mês' }
 *   { prefix: '', amount: 'Sob consulta', suffix: '' }
 */
function planPrice(plan) {
  if (plan.price === null || plan.price === undefined || plan.billingType === 'custom') {
    return { prefix: plan.pricePrefix || '', amount: 'Sob consulta', suffix: '', isCustom: true };
  }
  return {
    prefix: plan.pricePrefix || '',
    amount: currency(plan.price),
    suffix: plan.billingType === 'monthly' ? '/mês' : '',
    isCustom: false,
  };
}

const date = (value) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(value ? new Date(value) : new Date());

module.exports = { currency, planPrice, date };
