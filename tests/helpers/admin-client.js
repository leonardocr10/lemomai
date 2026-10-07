/** Cliente HTTP mínimo que guarda cookies e lê o token CSRF das páginas. */
function createClient(base) {
  const jar = new Map();
  let csrf = '';

  const store = (response) => {
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (/expires=Thu, 01 Jan 1970/i.test(header) || value === '') jar.delete(name);
      else jar.set(name, value);
    }
  };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');

  async function get(path) {
    const response = await fetch(base + path, { headers: { cookie: cookie() }, redirect: 'manual' });
    store(response);
    const body = await response.text();
    const match = body.match(/name="_csrf" value="([^"]+)"/);
    if (match) csrf = match[1];
    return { status: response.status, location: response.headers.get('location'), body };
  }

  async function post(path, fields = {}, { withCsrf = true } = {}) {
    const form = new URLSearchParams({ ...(withCsrf ? { _csrf: csrf } : {}), ...fields });
    const response = await fetch(base + path, {
      method: 'POST',
      headers: { cookie: cookie(), 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
      redirect: 'manual',
    });
    store(response);
    return { status: response.status, location: response.headers.get('location'), body: await response.text() };
  }

  async function login(username, password) {
    await get('/admin/login');
    return post('/admin/login', { username, password });
  }

  return { get, post, login, cookies: jar };
}

module.exports = { createClient };
