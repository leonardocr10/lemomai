/** Formatadores das telas do painel. */
const LEAD_STATUS = { new: 'Novo', contacted: 'Em contato', closed: 'Fechado', discarded: 'Descartado' };

const dateTime = (value) =>
  (value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—');

const leadStatus = (status) => LEAD_STATUS[status] || status;

const money = (value) =>
  (value === null || value === undefined
    ? 'Sob consulta'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value));

/** 1290.5 -> "1.290,50" para preencher o campo de preço. */
const priceInput = (value) =>
  (value === null || value === undefined
    ? ''
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value));

module.exports = { LEAD_STATUS, dateTime, leadStatus, money, priceInput };
