import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mockRoutes } from './fixtures/google-jobs.js';

// Mock SearchApi so the Netlify function can be called like Netlify would call it.
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const key = u.searchParams.get('next_page_token') || u.searchParams.get('q');
  res.setHeader('content-type', 'application/json');
  if (req.headers.authorization !== 'Bearer nk') { res.statusCode = 401; return res.end('{"error":"Invalid API key."}'); }
  res.end(JSON.stringify(mockRoutes()[key] || { jobs: [] }));
});
let base;
test.before(async () => {
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${srv.address().port}`;
  Object.assign(process.env, { SEARCHAPI_KEY: 'nk', SEARCHAPI_BASE_URL: `${base}/s`, REQUIRE_AUTH: 'false', FIREBASE_PROJECT_ID: 'demo', FIREBASE_API_KEY: 'k', FIREBASE_APP_ID: 'a', OLLAMA_MODEL: 'gemma4:e2b', OPENROUTER_API_KEY: 'or' });
});
test.after(() => { srv.closeAllConnections(); srv.close(); });

test('netlify function: config, streamed search, and OpenRouter coach', async () => {
  const fn = await import('../netlify/functions/api.mjs');
  assert.equal(fn.config.path, '/api/*');
  const cfg = await (await fn.default(new Request('https://im.netlify.app/api/config'))).json();
  assert.equal(cfg.coachReady, true);
  assert.equal(cfg.coachProvider, undefined, 'the AI provider is not shown to students');
  const r = await fn.default(new Request('https://im.netlify.app/api/search', { method: 'POST', body: JSON.stringify({ keywords: ['Marketing'] }) }));
  assert.equal(r.status, 200);
  const out = JSON.parse(await r.text());
  assert.equal(out.jobs.length, 7);
  process.env.SEARCHAPI_KEY = 'bad';
});
