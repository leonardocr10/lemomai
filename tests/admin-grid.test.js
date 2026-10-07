const test = require('node:test');
const assert = require('node:assert/strict');
const { parseGrid, gridUrl, pageItems } = require('../src/utils/admin-grid');

const options = { sortable: ['name', 'price', 'displayOrder'], defaultSort: 'displayOrder', defaultDir: 'asc' };

test('parseGrid usa padrões e ignora valores inválidos', () => {
  assert.deepEqual(parseGrid({}, options), { q: '', sort: 'displayOrder', dir: 'asc', page: 1, per: 25, offset: 0 });
  const state = parseGrid({ q: '  site ', sort: 'price', dir: 'desc', page: '3', per: '10' }, options);
  assert.deepEqual(state, { q: 'site', sort: 'price', dir: 'desc', page: 3, per: 10, offset: 20 });
  const bad = parseGrid({ sort: 'password_hash; DROP', dir: 'up', page: '-4', per: '9999' }, options);
  assert.equal(bad.sort, 'displayOrder');
  assert.equal(bad.dir, 'asc');
  assert.equal(bad.page, 1);
  assert.equal(bad.per, 25);
  assert.equal(parseGrid({ q: 'x'.repeat(500) }, options).q.length, 100);
});

test('gridUrl mantém o estado, aplica mudanças e omite padrões', () => {
  const state = parseGrid({ q: 'a b', sort: 'price', dir: 'desc', page: '2' }, options);
  assert.equal(gridUrl('/admin/planos', state, options), '/admin/planos?q=a+b&sort=price&dir=desc&page=2');
  assert.equal(gridUrl('/admin/planos', state, options, { page: 1 }), '/admin/planos?q=a+b&sort=price&dir=desc');
  assert.equal(gridUrl('/admin/leads', parseGrid({}, options), options, { status: 'new' }), '/admin/leads?status=new');
});

test('pageItems mostra vizinhas, extremos e reticências', () => {
  assert.deepEqual(pageItems(1, 1), [1]);
  assert.deepEqual(pageItems(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageItems(6, 12), [1, '…', 5, 6, 7, '…', 12]);
  assert.deepEqual(pageItems(1, 12), [1, 2, '…', 12]);
});
