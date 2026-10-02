import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchApi, SearchApiError } from '../server/searchapi.js';

const job = { title: 'Marketing Intern', company_name: 'ABC', location: 'Ho Chi Minh City' };
const reply = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

function client(handler, extra = {}) {
  const seen = [];
  const api = createSearchApi({
    apiKey: 'k', baseUrl: 'https://example.test/search', location: 'Ho Chi Minh City,Ho Chi Minh City,Vietnam', hl: 'en', gl: 'vn', timeoutMs: 5000, ...extra,
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

test('no second request when the caller has no budget for it', async () => {
  const { api, seen } = client(() => reply({ error: "Google Jobs didn't return any results." }));
  const r = await api.jobs({ q: 'marketing intern part time', retry: false });
  assert.equal(seen.length, 1);
  assert.equal(r.calls, 1);
  assert.deepEqual(r.data.jobs_results, []);
});

/* ---------- SerpApi: the second service, same Google Jobs listings ---------- */
import { createSearchChain } from '../server/searchapi.js';
import { normalize } from '../server/jobs.js';
import { createCache } from '../server/cache.js';

// One listing the way SerpApi sends it (https://serpapi.com/google-jobs-api).
const serpJob = {
  title: 'Marketing Intern', company_name: 'ABC', location: 'Ho Chi Minh City, Vietnam', via: 'LinkedIn',
  share_link: 'https://www.google.com/search?ibp=htl;jobs&q=marketing', thumbnail: 'https://serpapi.com/searches/1/images/a.jpeg',
  extensions: ['2 days ago', 'Internship'], detected_extensions: { posted_at: '2 days ago', schedule_type: 'Internship' },
  description: 'Help the team.', job_highlights: [{ title: 'Qualifications', items: ['Canva'] }],
  apply_options: [{ title: 'LinkedIn', link: 'https://www.linkedin.com/jobs/view/1' }, { title: 'TopCV', link: 'https://www.topcv.vn/viec-lam/1' }],
  job_id: 'abc',
};

function serpClient(handler, extra = {}) {
  const seen = [];
  const api = createSearchApi({
    provider: 'serpapi', apiKey: 'serp-key', baseUrl: 'https://example.test/search.json', location: 'Ho Chi Minh City,Ho Chi Minh City,Vietnam', hl: 'en', gl: 'vn', timeoutMs: 5000, ...extra,
    fetchImpl: async (url, init) => { const p = Object.fromEntries(url.searchParams); seen.push({ ...p, headers: init.headers }); return handler(p); },
  });
  return { api, seen };
}

test('SerpApi: the key goes in the query, and its field names are read like SearchApi\'s', async () => {
  const { api, seen } = serpClient(() => reply({ jobs_results: [serpJob], serpapi_pagination: { next_page_token: 'p2' } }));
  const r = await api.jobs({ q: 'marketing intern' });
  assert.equal(seen[0].api_key, 'serp-key');
  assert.equal(seen[0].headers.authorization, undefined);
  assert.equal(seen[0].engine, 'google_jobs');
  assert.equal(seen[0].location, 'Ho Chi Minh City,Ho Chi Minh City,Vietnam');
  assert.equal(r.data.next_page_token, 'p2');
  const job = normalize(r.data.jobs_results[0]);
  assert.deepEqual(job.applyOptions, [{ title: 'LinkedIn', link: 'https://www.linkedin.com/jobs/view/1' }, { title: 'TopCV', link: 'https://www.topcv.vn/viec-lam/1' }]);
  assert.equal(job.shareLink, 'https://www.google.com/search?ibp=htl;jobs&q=marketing');
  assert.equal(job.scheduleType, 'Internship');
  assert.equal(job.via, 'LinkedIn');
  assert.equal(job.thumbnail, null, 'the picture is a temporary copy on SerpApi, so it is not kept');
  assert.doesNotMatch(JSON.stringify(job), /serpapi/i);
});

test('SerpApi: "hasn\'t returned any results" is an empty search, and the next page uses its token', async () => {
  const { api, seen } = serpClient((p) => (p.next_page_token ? reply({ jobs_results: [serpJob] }) : reply({ search_metadata: { status: 'Success' }, error: "Google hasn't returned any results for this query." })));
  const empty = await api.jobs({ q: 'zzqq intern', retry: false });
  assert.deepEqual(empty.data.jobs_results, []);
  const page2 = await api.jobs({ q: 'marketing intern', nextPageToken: 'p2' });
  assert.equal(seen[1].next_page_token, 'p2');
  assert.equal(page2.data.jobs_results.length, 1);
  assert.equal(page2.data.next_page_token, null);
});

test('"too many requests" keeps its meaning, with or without a JSON answer', async () => {
  const a = client(() => reply({ error: 'You have exceeded your hourly rate limit.' }, 429));
  await assert.rejects(a.api.jobs({ q: 'x intern' }), (e) => e instanceof SearchApiError && e.status === 429 && e.upstream === 429);
  const b = serpClient(() => reply({ error: 'Your account has run out of searches.' }, 429));
  await assert.rejects(b.api.jobs({ q: 'x intern' }), (e) => e.status === 429 && /run out of searches/.test(e.message));
  const c = client(() => ({ ok: false, status: 429, json: async () => { throw new SyntaxError('Unexpected token <'); } }));
  await assert.rejects(c.api.jobs({ q: 'x intern' }), (e) => e.status === 429);
  const d = client(() => reply({ error: 'Invalid API key.' }, 401));
  await assert.rejects(d.api.jobs({ q: 'x intern' }), (e) => e.status === 502 && e.upstream === 401);
});

/* ---------- Two services in a row ---------- */
function chainOf(firstHandler, secondHandler, { cache, restMs = 600000 } = {}) {
  let t = 1000;
  const first = client(firstHandler, { cache }), second = serpClient(secondHandler, { cache });
  const chain = createSearchChain([first.api, second.api], { restMs, now: () => t });
  return { chain, first, second, tick: (ms) => { t += ms; } };
}
const LIMIT = () => reply({ error: 'You have exceeded your hourly rate limit.' }, 429);
const OK = () => reply({ jobs: [job], pagination: { next_page_token: 'a2' } });
const SERP_OK = () => reply({ jobs_results: [serpJob], serpapi_pagination: { next_page_token: 'b2' } });

test('when the first service refuses, the second answers and the first is left alone for a while', async () => {
  const { chain, first, second, tick } = chainOf(LIMIT, SERP_OK);
  const r = await chain.jobs({ q: 'marketing intern' });
  assert.equal(r.provider, 'serpapi');
  assert.equal(r.data.jobs_results.length, 1);
  assert.equal(r.calls, 1, 'only the request that was answered counts');
  assert.equal(first.seen.length, 1);
  await chain.jobs({ q: 'data intern' });
  assert.equal(first.seen.length, 1, 'no second try while it rests');
  assert.equal(second.seen.length, 2);
  tick(600001);
  await chain.jobs({ q: 'finance intern' });
  assert.equal(first.seen.length, 2, 'tried again after the rest');
});

test('the first service is used while it works, and a page token goes back to the service that issued it', async () => {
  const { chain, first, second } = chainOf((p) => (p.next_page_token ? reply({ jobs: [job] }) : OK()), (p) => (p.next_page_token ? reply({ jobs_results: [serpJob] }) : SERP_OK()));
  const r = await chain.jobs({ q: 'marketing intern' });
  assert.equal(r.provider, 'searchapi');
  assert.equal(r.data.next_page_token, 'searchapi:a2');
  assert.equal(second.seen.length, 0);
  await chain.jobs({ q: 'marketing intern', nextPageToken: r.data.next_page_token });
  assert.equal(first.seen[1].next_page_token, 'a2');
  await chain.jobs({ q: 'marketing intern', nextPageToken: 'serpapi:b2' });
  assert.equal(second.seen[0].next_page_token, 'b2');
  await assert.rejects(chain.jobs({ q: 'marketing intern', nextPageToken: 'a2' }), SearchApiError);
});

test('a service that can\'t be reached or has a bad key also hands over; when every service refuses the answer is "busy"', async () => {
  const down = chainOf(() => { throw new TypeError('fetch failed'); }, SERP_OK);
  assert.equal((await down.chain.jobs({ q: 'marketing intern' })).provider, 'serpapi');
  await down.chain.jobs({ q: 'data intern' });
  assert.equal(down.first.seen.length, 2, 'a network error does not put the service to rest');
  const badKey = chainOf(() => reply({ error: 'Invalid API key.' }, 401), SERP_OK);
  assert.equal((await badKey.chain.jobs({ q: 'marketing intern' })).provider, 'serpapi');
  const none = chainOf(LIMIT, () => reply({ error: 'Your account has run out of searches.' }, 429));
  await assert.rejects(none.chain.jobs({ q: 'marketing intern' }), (e) => e instanceof SearchApiError && e.status === 429);
  await assert.rejects(none.chain.jobs({ q: 'marketing intern' }), (e) => e.status === 429);
  assert.equal(none.first.seen.length, 2, 'with every service resting, they are all asked again (the limit may be over)');
  const mixed = chainOf(() => reply({ error: 'Invalid API key.' }, 401), () => reply({ error: 'Your account has run out of searches.' }, 429));
  await assert.rejects(mixed.chain.jobs({ q: 'marketing intern' }), (e) => e.status === 429);
  await assert.rejects(createSearchChain([]).jobs({ q: 'x' }), (e) => e.status === 503);
});

test('an answer one service already gave is reused, even after that service starts refusing', async () => {
  let limited = false;
  const { chain, first, second } = chainOf(() => (limited ? LIMIT() : OK()), SERP_OK, { cache: createCache({ dir: '', ttlMs: 3600e3 }) });
  await chain.jobs({ q: 'marketing intern' });
  limited = true;
  assert.equal((await chain.jobs({ q: 'data intern' })).provider, 'serpapi'); // the first now refuses and rests
  const before = first.seen.length + second.seen.length;
  const again = await chain.jobs({ q: 'marketing intern' });
  assert.equal(again.cached, true);
  assert.equal(again.provider, 'searchapi');
  assert.equal(again.calls, 0);
  assert.equal(again.data.next_page_token, 'searchapi:a2');
  assert.equal(first.seen.length + second.seen.length, before, 'no request was made');
  const fresh = await chain.jobs({ q: 'marketing intern', fresh: true }); // "Search again" asks the services anew
  assert.equal(fresh.provider, 'serpapi');
});
