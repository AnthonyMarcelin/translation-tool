// Integration tests driving the real Express app over HTTP against a
// throwaway SQLite database. Run with `npm test`.
//
// Uses Node's built-in test runner + fetch — no extra dependencies.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

// Point the DB layer at a temp file and set a test secret BEFORE requiring the
// app, so db-better.js opens the throwaway database on import.
const tmpDb = path.join(os.tmpdir(), `tlt-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const app = require('../index');

let server, base;

before(async () => {
  server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  // Clean up the temp DB and its WAL/SHM siblings.
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(tmpDb + suffix); } catch { /* ignore */ }
  }
});

function api(path, { method = 'GET', token, apiKey, body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (apiKey) headers['X-API-Key'] = apiKey;
  return fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── Health ────────────────────────────────────────────────────────────────

test('GET / returns ok status', async () => {
  const res = await api('/');
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'ok');
});

// ─── Auth ────────────────────────────────────────────────────────────────

test('login with seeded admin returns tokens', async () => {
  const res = await api('/auth/login', { method: 'POST', body: { email: 'admin@local.dev', password: 'admin123' } });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(json.access_token, 'access_token present');
  assert.ok(json.refresh_token, 'refresh_token present');
  assert.equal(json.user.email, 'admin@local.dev');
});

test('login with wrong password is rejected', async () => {
  const res = await api('/auth/login', { method: 'POST', body: { email: 'admin@local.dev', password: 'nope' } });
  assert.equal(res.status, 401);
});

test('refresh rotates the token: old token rejected, new one works', async () => {
  const login = await (await api('/auth/login', { method: 'POST', body: { email: 'admin@local.dev', password: 'admin123' } })).json();
  const rt1 = login.refresh_token;

  const r1 = await api('/auth/refresh', { method: 'POST', body: { refresh_token: rt1 } });
  assert.equal(r1.status, 200);
  const j1 = await r1.json();
  assert.equal(typeof j1.refresh_token, 'string', 'rotation returns a new refresh_token string');
  assert.notEqual(j1.refresh_token, rt1, 'new refresh token differs from old');

  // Old token must now be invalid.
  const rOld = await api('/auth/refresh', { method: 'POST', body: { refresh_token: rt1 } });
  assert.equal(rOld.status, 401);

  // New token must work.
  const rNew = await api('/auth/refresh', { method: 'POST', body: { refresh_token: j1.refresh_token } });
  assert.equal(rNew.status, 200);
});

test('protected route requires auth', async () => {
  const res = await api('/orgs');
  assert.equal(res.status, 401);
});

test('GET /auth/me returns the user and their orgs', async () => {
  const login = await (await api('/auth/login', { method: 'POST', body: { email: 'admin@local.dev', password: 'admin123' } })).json();
  const res = await api('/auth/me', { token: login.access_token });
  assert.equal(res.status, 200);
  const me = await res.json();
  assert.equal(me.email, 'admin@local.dev');
  assert.ok(Array.isArray(me.organizations) && me.organizations.length >= 1);
});

// ─── Export via API key (the core product flow) ──────────────────────────────

test('API key export returns flat JSON for a language', async (t) => {
  const login = await (await api('/auth/login', { method: 'POST', body: { email: 'admin@local.dev', password: 'admin123' } })).json();
  const token = login.access_token;

  // Find the seeded Demo Project.
  const me = await (await api('/auth/me', { token })).json();
  const slug = me.organizations[0].slug;
  const projects = await (await api(`/orgs/${slug}/projects`, { token })).json();
  const demo = projects.find(p => p.name === 'Demo Project');
  assert.ok(demo, 'Demo Project exists');

  // Create an API key.
  const keyRes = await api(`/projects/${demo.id}/api-keys`, { method: 'POST', token, body: { name: 'test-key', permissions: 'read' } });
  assert.equal(keyRes.status, 201);
  const keyJson = await keyRes.json();
  assert.match(keyJson.key, /^tlt_/, 'key has tlt_ prefix');

  // Export French translations using the API key (no JWT).
  const exp = await api('/v1/export/fr', { apiKey: keyJson.key });
  assert.equal(exp.status, 200);
  const fr = await exp.json();
  assert.equal(fr.welcome, 'Bienvenue sur notre plateforme');
  assert.equal(fr.login, 'Se connecter');

  // export/all returns every language.
  const all = await (await api('/v1/export/all', { apiKey: keyJson.key })).json();
  assert.ok(all.fr && all.en, 'all-languages export includes fr and en');
  assert.equal(all.en.welcome, 'Welcome to our platform');
});

test('export endpoint rejects an invalid API key', async () => {
  const res = await api('/v1/export/fr', { apiKey: 'tlt_invalid' });
  assert.equal(res.status, 401);
});

// ─── Validation guards ───────────────────────────────────────────────────────

test('inviting with an invalid role returns 400, not 500', async () => {
  const login = await (await api('/auth/login', { method: 'POST', body: { email: 'admin@local.dev', password: 'admin123' } })).json();
  const token = login.access_token;
  const me = await (await api('/auth/me', { token })).json();
  const projects = await (await api(`/orgs/${me.organizations[0].slug}/projects`, { token })).json();
  const demo = projects.find(p => p.name === 'Demo Project');

  const res = await api(`/projects/${demo.id}/invites`, { method: 'POST', token, body: { email: 'x@y.com', role: 'superadmin' } });
  assert.equal(res.status, 400);
});
