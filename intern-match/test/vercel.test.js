import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { mockRoutes } from './fixtures/google-jobs.js';

// Mock SearchApi so the Vercel functions can be called the way Vercel calls them (Web Request → Response).
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const key = u.searchParams.get('next_page_token') || u.searchParams.get('q');
  res.setHeader('content-type', 'application/json');
  if (req.headers.authorization !== 'Bearer vk') { res.statusCode = 401; return res.end('{"error":"Invalid API key."}'); }
  res.end(JSON.stringify(mockRoutes()[key] || { jobs: [] }));
});
test.before(async () => {
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  Object.assign(process.env, { SEARCHAPI_KEY: 'vk', SEARCHAPI_BASE_URL: `http://127.0.0.1:${srv.address().port}/s`, REQUIRE_AUTH: 'false',
    FIREBASE_PROJECT_ID: 'demo', FIREBASE_API_KEY: 'k', FIREBASE_APP_ID: 'a', OLLAMA_MODEL: 'gemma4:e2b', OPENROUTER_API_KEY: 'or', VERCEL_URL: 'im.vercel.app' });
});
test.after(() => { srv.closeAllConnections(); srv.close(); });

test('vercel: one function file per API route, config and streamed search work', async () => {
  for (const name of ['search', 'coach', 'config', 'health']) assert.ok(existsSync(new URL(`../api/${name}.js`, import.meta.url)), `api/${name}.js`);
  const cfgFn = (await import('../api/config.js')).default;
  const cfg = await (await cfgFn.fetch(new Request('https://im.vercel.app/api/config'))).json();
  assert.equal(cfg.firebase.projectId, 'demo');
  assert.equal(cfg.coachReady, true, 'OpenRouter is used; Ollama is ignored on Vercel');
  const searchFn = (await import('../api/search.js')).default;
  const r = await searchFn.fetch(new Request('https://im.vercel.app/api/search', { method: 'POST', body: JSON.stringify({ keywords: ['Marketing'] }) }));
  assert.equal(r.status, 200);
  const lines = (await r.text()).split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  assert.equal(lines.at(-1).jobs.length, 7);
  const vc = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(vc.outputDirectory, 'public');
  assert.ok(vc.functions['api/*.js'].maxDuration >= 60);
  assert.match(vc.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value, /default-src 'self'/);
});
