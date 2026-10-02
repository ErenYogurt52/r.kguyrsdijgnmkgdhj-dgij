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
// The same server plays SerpApi under /serpapi: there the key is a query parameter and the
// listings use SerpApi's field names.
const calls = [];
const toSerpApi = ({ apply_links: links, apply_link, sharing_link: share, ...job }) => ({ ...job, share_link: share, thumbnail: 'https://serpapi.com/searches/1/images/x.jpeg', apply_options: links.map((l) => ({ title: l.source, link: l.link })) });
const serpServer = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  calls.push({ ...Object.fromEntries(u.searchParams), path: u.pathname });
  const routes = mockRoutes();
  const key = u.searchParams.get('next_page_token') || u.searchParams.get('q');
  res.setHeader('content-type', 'application/json');
  calls[calls.length - 1].auth = req.headers.authorization;
  if (u.pathname.startsWith('/serpapi')) {
    if (u.searchParams.get('api_key') === 'empty-key') { res.statusCode = 429; return res.end(JSON.stringify({ error: 'Your account has run out of searches.' })); }
    if (u.searchParams.get('api_key') !== 'serp-key') { res.statusCode = 401; return res.end(JSON.stringify({ error: 'Invalid API key. Your API key should be here: https://serpapi.com/manage-api-key' })); }
    if (!routes[key]) return res.end(JSON.stringify({ search_metadata: { status: 'Success' }, error: "Google hasn't returned any results for this query." }));
    return res.end(JSON.stringify({ search_metadata: { status: 'Success' }, jobs_results: routes[key].jobs.map(toSerpApi), serpapi_pagination: routes[key].pagination }));
  }
  if (u.searchParams.has('api_key')) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'key must not be in the URL' })); }
  if (req.headers.authorization === 'Bearer limit-key') { res.statusCode = 429; return res.end(JSON.stringify({ error: 'You have exceeded your hourly rate limit.' })); }
  if (req.headers.authorization !== 'Bearer test-key') { res.statusCode = 401; return res.end(JSON.stringify({ error: 'Invalid API key.' })); }
  if ((u.searchParams.get('q') || '').startsWith('Boom')) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'SearchApi had an internal error.' })); }
  if (u.searchParams.get('location') === 'Nowhere') { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Unsupported `location` parameter.' })); }
  if (!routes[key]) return res.end(JSON.stringify({ search_metadata: { status: 'Success' }, jobs: [] }));
  res.end(JSON.stringify(routes[key]));
});

let base, serpBase;
const servers = [];
const listen = (s) => new Promise((ok) => { servers.push(s); s.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${s.address().port}`)); });

function makeServer(env) {
  const cfg = settings({ SEARCHAPI_BASE_URL: `${serpBase}/api/v1/search`, SERPAPI_BASE_URL: `${serpBase}/serpapi/search.json`, CACHE_DIR: mkdtempSync(join(tmpdir(), 'im-')), FIREBASE_PROJECT_ID: 'demo', FIREBASE_API_KEY: 'k', FIREBASE_APP_ID: 'a', ...env });
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

test('missing or wrong SearchApi key gives a plain message without provider details', async () => {
  const none = await listen(makeServer({ SEARCHAPI_KEY: '' }));
  const r1 = await post(none, { keywords: ['Marketing'] });
  assert.equal(r1.status, 503);
  assert.match((await r1.json()).error.message, /not set up/);
  const wrong = await listen(makeServer({ SEARCHAPI_KEY: 'nope' }));
  const r2 = await post(wrong, { keywords: ['Marketing'] });
  assert.equal(r2.status, 502);
  const m2 = (await r2.json()).error.message;
  assert.match(m2, /had a problem/);
  assert.doesNotMatch(m2, /SearchApi|Google/i);
});

test('an unknown location falls back to the city name in the query', async () => {
  const srv = await listen(makeServer({ SEARCHAPI_KEY: 'test-key', SEARCH_LOCATION: 'Nowhere' }));
  const r = await post(srv, { keywords: ['Marketing'] });
  assert.equal(r.status, 200);
  assert.ok(calls.some((c) => c.q === 'Marketing intern Hồ Chí Minh' && !c.location));
});

test('the job type filter reaches the search (and unknown values fall back to any)', async () => {
  const srv = await listen(makeServer({ SEARCHAPI_KEY: 'test-key' }));
  const before = calls.length;
  const r = await post(srv, { keywords: ['Marketing'], profile: { jobType: 'parttime' } });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).meta.jobType, 'parttime');
  assert.ok(calls.slice(before).some((c) => c.q === 'Marketing intern part time'), JSON.stringify(calls.slice(before)));
  const odd = await post(srv, { keywords: ['Marketing'], profile: { jobType: 'weekends' } });
  assert.equal((await odd.json()).meta.jobType, 'any');
});

test('when the first search service is out of requests, the second one answers the same search', async () => {
  const srv = await listen(makeServer({ SEARCHAPI_KEY: 'limit-key', SERPAPI_KEY: 'serp-key' }));
  const before = calls.length;
  const r = await post(srv, { keywords: ['Marketing'], profile: { skills: ['SEO'], areas: ['td'], modes: [] } });
  assert.equal(r.status, 200);
  const text = await r.text(), out = JSON.parse(text);
  assert.equal(out.jobs.length, 7, 'the same listings as with the first service');
  assert.ok(out.jobs.every((j) => j.applyOptions.length > 0 && j.shareLink));
  assert.equal(out.meta.stats.calls, 4);
  const mine = calls.slice(before);
  assert.equal(mine.filter((c) => !c.path.startsWith('/serpapi')).length, 1, 'the first service is asked once, then left alone');
  assert.ok(mine.filter((c) => c.path.startsWith('/serpapi')).every((c) => c.api_key === 'serp-key' && !c.auth));
  assert.ok(mine.some((c) => c.path.startsWith('/serpapi') && c.next_page_token === 'mkt-p2'), 'page 2 uses the second service\'s own token');
  assert.doesNotMatch(text, /serpapi|searchapi/i, 'the browser never learns which service answered');
});

test('SERPAPI_KEY alone is enough, and SEARCH_PROVIDERS sets the order', async () => {
  const only = await listen(makeServer({ SEARCHAPI_KEY: '', SERPAPI_KEY: 'serp-key' }));
  assert.equal((await (await fetch(`${only}/api/config`)).json()).searchReady, true);
  assert.equal((await post(only, { keywords: ['Marketing'] })).status, 200);
  const before = calls.length;
  const swapped = await listen(makeServer({ SEARCHAPI_KEY: 'test-key', SERPAPI_KEY: 'serp-key', SEARCH_PROVIDERS: 'serpapi,searchapi' }));
  assert.equal((await post(swapped, { keywords: ['Marketing'] })).status, 200);
  assert.ok(calls.slice(before).every((c) => c.path.startsWith('/serpapi')));
  assert.deepEqual(settings({ SEARCHAPI_KEY: 'a', SERPAPI_KEY: 'b' }).search.providers.map((p) => p.provider), ['searchapi', 'serpapi']);
  assert.deepEqual(settings({ SEARCHAPI_KEY: 'a', SERPAPI_KEY: 'b', SEARCH_PROVIDERS: 'serpapi' }).search.providers.map((p) => p.provider), ['serpapi']);
  assert.deepEqual(settings({}).search.providers, []);
});

test('when every search service is out of requests the student sees "busy", without provider details', async () => {
  for (const env of [{ SEARCHAPI_KEY: 'limit-key' }, { SEARCHAPI_KEY: 'limit-key', SERPAPI_KEY: 'empty-key' }, { SEARCHAPI_KEY: 'nope', SERPAPI_KEY: 'empty-key' }]) {
    const srv = await listen(makeServer(env));
    const r = await post(srv, { keywords: ['Marketing'] });
    assert.equal(r.status, 429, JSON.stringify(env));
    const { error } = await r.json();
    assert.equal(error.code, 'search_failed');
    assert.match(error.message, /busy right now/);
    assert.doesNotMatch(error.message, /SearchApi|SerpApi|Google|credits|searches/i);
  }
});

test('when only some queries fail, the listings still come back and the reason stays on the server', async () => {
  const srv = await listen(makeServer({ SEARCHAPI_KEY: 'test-key' }));
  const r = await post(srv, { keywords: ['Marketing', 'Boom'] });
  assert.equal(r.status, 200);
  const text = await r.text(), out = JSON.parse(text);
  assert.ok(out.jobs.length > 0);
  assert.equal(out.meta.partial, true);
  assert.equal(out.meta.warning, 'Some searches did not finish.');
  assert.doesNotMatch(text, /SearchApi|SerpApi/i);
});
