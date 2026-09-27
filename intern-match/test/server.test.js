import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/index.js';
import { settings } from '../server/env.js';
import { mockRoutes } from './fixtures/google-jobs.js';

// Mock SearchApi over real HTTP so the fetch path, params and cache are exercised.
const calls = [];
const serpServer = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  calls.push(Object.fromEntries(u.searchParams));
  const routes = mockRoutes();
  const key = u.searchParams.get('next_page_token') || u.searchParams.get('q');
  res.setHeader('content-type', 'application/json');
  calls[calls.length - 1].auth = req.headers.authorization;
  if (u.searchParams.has('api_key')) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'key must not be in the URL' })); }
  if (req.headers.authorization !== 'Bearer test-key') { res.statusCode = 401; return res.end(JSON.stringify({ error: 'Invalid API key.' })); }
  if (u.searchParams.get('location') === 'Nowhere') { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Unsupported `location` parameter.' })); }
  if (!routes[key]) return res.end(JSON.stringify({ search_metadata: { status: 'Success' }, jobs: [] }));
  res.end(JSON.stringify(routes[key]));
});

let base, serpBase;
const servers = [];
const listen = (s) => new Promise((ok) => { servers.push(s); s.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${s.address().port}`)); });

function makeServer(env) {
  const cfg = settings({ SEARCHAPI_BASE_URL: `${serpBase}/api/v1/search`, CACHE_DIR: mkdtempSync(join(tmpdir(), 'im-')), FIREBASE_PROJECT_ID: 'demo', FIREBASE_API_KEY: 'k', FIREBASE_APP_ID: 'a', ...env });
  const verifyToken = async (t) => { if (t !== 'good-token') throw Object.assign(new Error('bad'), { name: 'AuthError' }); return { uid: 'u1' }; };
  return http.createServer(createApp(cfg, { verifyToken }));
}

test.before(async () => { serpBase = await listen(serpServer); base = await listen(makeServer({ SEARCHAPI_KEY: 'test-key', SEARCHES_PER_USER_PER_DAY: '2' })); });
test.after(() => { for (const s of servers) { s.closeAllConnections(); s.close(); } });

const post = (b, body, token = 'good-token') => fetch(`${b}/api/search`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });

test('serves the app shell and config with security headers', async () => {
  const r = await fetch(`${base}/`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(await r.text(), /Intern Match/);
  const c = await (await fetch(`${base}/api/config`)).json();
  assert.equal(c.firebase.projectId, 'demo');
  assert.equal(c.searchReady, true);
  assert.equal((await fetch(`${base}/../server/index.js`)).status, 404);
  assert.equal((await fetch(`${base}/..%2fserver%2findex.js`)).status, 403);
});

test('search requires a signed-in user', async () => {
  assert.equal((await post(base, { keywords: ['Marketing'] }, null)).status, 401);
  assert.equal((await post(base, { keywords: ['Marketing'] }, 'forged')).status, 401);
});

test('search returns at most 10 eligible HCMC jobs and caches SearchApi calls', async () => {
  const r = await post(base, { keywords: ['Marketing'], profile: { skills: ['SEO'], areas: ['td'], modes: [] } });
  assert.equal(r.status, 200);
  const out = await r.json();
  assert.equal(out.jobs.length, 7);
  assert.equal(calls[0].engine, 'google_jobs');
  assert.equal(calls[0].location, 'Ho Chi Minh City,Ho Chi Minh City,Vietnam');
  assert.equal(calls[0].gl, 'vn');
  assert.equal(calls[0].auth, 'Bearer test-key');
  assert.equal(out.meta.stats.calls, 4);
  assert.equal(out.meta.remainingToday, 1);
  const n = calls.length;
  const again = await (await post(base, { keywords: ['Marketing'] })).json();
  assert.equal(calls.length, n, 'second search is served from cache');
  assert.equal(again.meta.stats.cachedCalls, 4);
  assert.equal(again.meta.remainingToday, 1, 'cached searches do not count');
});

test('daily limit and bad input', async () => {
  assert.equal((await post(base, { keywords: [] })).status, 400);
  assert.equal((await post(base, { keywords: ['Data analyst'] })).status, 200); // 2nd paid search
  const r = await post(base, { keywords: ['Finance'] });
  assert.equal(r.status, 429);
  assert.equal((await r.json()).error.code, 'daily_limit');
});

test('missing or wrong SearchApi key gives a clear message', async () => {
  const none = await listen(makeServer({ SEARCHAPI_KEY: '' }));
  const r1 = await post(none, { keywords: ['Marketing'] });
  assert.equal(r1.status, 503);
  assert.match((await r1.json()).error.message, /SEARCHAPI_KEY/);
  const wrong = await listen(makeServer({ SEARCHAPI_KEY: 'nope' }));
  const r2 = await post(wrong, { keywords: ['Marketing'] });
  assert.equal(r2.status, 502);
  assert.match((await r2.json()).error.message, /Invalid API key/);
});

test('an unknown location falls back to the city name in the query', async () => {
  const srv = await listen(makeServer({ SEARCHAPI_KEY: 'test-key', SEARCH_LOCATION: 'Nowhere' }));
  const r = await post(srv, { keywords: ['Marketing'] });
  assert.equal(r.status, 200);
  assert.ok(calls.some((c) => c.q === 'Marketing intern Hồ Chí Minh' && !c.location));
});
