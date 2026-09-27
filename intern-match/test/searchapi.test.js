import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchApi, SearchApiError } from '../server/searchapi.js';

const job = { title: 'Marketing Intern', company_name: 'ABC', location: 'Ho Chi Minh City' };
const reply = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

function client(handler) {
  const seen = [];
  const api = createSearchApi({
    apiKey: 'k', baseUrl: 'https://example.test/search', location: 'Ho Chi Minh City,Ho Chi Minh City,Vietnam', hl: 'en', gl: 'vn', timeoutMs: 5000,
    fetchImpl: async (url) => { const p = Object.fromEntries(url.searchParams); seen.push(p); return handler(p); },
  });
  return { api, seen };
}

test('an empty search ("didn\'t return any results") is not an error', async () => {
  const { api } = client(() => reply({ error: "Google Jobs didn't return any results." }));
  const r = await api.jobs({ q: 'marketing intern' });
  assert.deepEqual(r.data.jobs_results, []);
});

test('no results with the location filter → retries once with the city in the query', async () => {
  const { api, seen } = client((p) => (p.location ? reply({ error: "Google Jobs didn't return any results." }) : reply({ jobs: [job] })));
  const r = await api.jobs({ q: 'marketing intern' });
  assert.equal(r.data.jobs_results.length, 1);
  assert.equal(seen.length, 2);
  assert.equal(seen[1].q, 'marketing intern Hồ Chí Minh');
  assert.equal(seen[1].location, undefined);
});

test('other SearchApi errors still fail', async () => {
  const { api } = client(() => reply({ error: 'Invalid API key.' }, 401));
  await assert.rejects(api.jobs({ q: 'x intern' }), SearchApiError);
});
