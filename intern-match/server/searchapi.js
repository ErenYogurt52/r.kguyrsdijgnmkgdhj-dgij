// Google Jobs search. Two services read the same Google Jobs listings and answer in almost the
// same JSON, so one client speaks both:
//   SearchApi.io  https://www.searchapi.io/docs/google-jobs   SEARCHAPI_KEY
//   SerpApi       https://serpapi.com/google-jobs-api          SERPAPI_KEY
// One call = one request credit at that service (calls served from our cache are free).

export class SearchApiError extends Error {
  // status: what our own API answers with (429 busy, 503 not set up, 502/504 anything else).
  // upstream: the HTTP status the search service sent, or 0 when it never answered.
  constructor(message, status, upstream = 0) { super(message); this.name = 'SearchApiError'; this.status = status; this.upstream = upstream; }
}

// Both services report an empty search as an error: "Google Jobs didn't return any results."
// (SearchApi), "Google hasn't returned any results for this query." (SerpApi).
const NO_RESULTS = /(return(ed)?\s+any\s+results|no\s+results|0\s+results)/i;

// What differs between the two: where the key goes and a few field names.
const DIALECTS = {
  searchapi: {
    label: 'SearchApi', keyName: 'SEARCHAPI_KEY',
    // The key goes in the Authorization header so it never shows up in URLs or logs.
    sign: (url, headers, key) => { headers.authorization = `Bearer ${key}`; },
    jobs: (d) => (Array.isArray(d.jobs) ? d.jobs : []),
    nextToken: (d) => d.pagination?.next_page_token || null,
  },
  serpapi: {
    label: 'SerpApi', keyName: 'SERPAPI_KEY',
    // SerpApi only takes the key as a query parameter. This URL is never logged or shown.
    sign: (url, headers, key) => { url.searchParams.set('api_key', key); },
    // Same listings under SearchApi's names: apply_options[{title, link}] → apply_links[{source, link}],
    // share_link → sharing_link. The thumbnail is a temporary copy on SerpApi's servers, so it is left out.
    jobs: (d) => (Array.isArray(d.jobs_results) ? d.jobs_results : []).map(({ apply_options: options, share_link: share, thumbnail, ...job }) => ({
      ...job, sharing_link: share,
      apply_links: (Array.isArray(options) ? options : []).filter(Boolean).map((o) => ({ source: o.title, link: o.link })),
    })),
    nextToken: (d) => d.serpapi_pagination?.next_page_token || null,
  },
};

export function createSearchApi({ provider = 'searchapi', apiKey, baseUrl, location, hl, gl, timeoutMs, cache, fetchImpl = fetch }) {
  const dialect = DIALECTS[provider];
  if (!dialect) throw new Error(`Unknown search service "${provider}"`);
  const { label } = dialect;
  let useLocation = Boolean(location);
  const paramsOf = ({ q, nextPageToken, noLocation = false }) => {
    const params = useLocation && !noLocation ? { engine: 'google_jobs', q, location, hl, gl } : { engine: 'google_jobs', q: `${q} Hồ Chí Minh`, hl, gl };
    if (nextPageToken) params.next_page_token = nextPageToken;
    return params;
  };
  // Each service keeps its own cached answers: a page token only works where it was issued.
  const keyOf = (params) => (provider === 'searchapi' ? '' : `${provider}:`) + JSON.stringify(params);

  // Returns { data: { jobs_results, next_page_token }, cached, requests, calls }: requests made in total,
  // and how many of them really went to the service (calls; the rest came from the cache).
  // deadline (ms timestamp): no request may run past it. retry: allowed to spend a second request.
  async function jobs({ q, nextPageToken, fresh = false, deadline = Infinity, retry = true }) {
    if (!apiKey) throw new SearchApiError(`Search is not set up: add ${dialect.keyName} to .env`, 503);
    const left = () => Math.min(timeoutMs, deadline - Date.now());
    try {
      const out = await call({ q, nextPageToken, fresh, timeout: left() });
      let calls = out.cached ? 0 : 1;
      // Google Jobs sometimes finds nothing for the location filter but does find jobs when the
      // city is in the query itself, so try that once before giving up on this query.
      if (retry && useLocation && !nextPageToken && !out.data.jobs_results.length && deadline - Date.now() > 5000) {
        const alt = await call({ q, nextPageToken, fresh, noLocation: true, timeout: left() });
        calls += alt.cached ? 0 : 1;
        if (alt.data.jobs_results.length) return { ...alt, cached: out.cached && alt.cached, requests: 2, calls };
        return { ...out, cached: out.cached && alt.cached, requests: 2, calls };
      }
      return { ...out, requests: 1, calls };
    } catch (e) {
      // If the service doesn't recognise the location name, fall back to putting the city in the query.
      if (useLocation && e instanceof SearchApiError && /location/i.test(e.message) && !nextPageToken) {
        console.warn(`[search] ${label}: location "${location}" was rejected (${e.message}); searching with the city name in the query instead. Set SEARCH_LOCATION in .env to fix.`);
        useLocation = false;
        const out = await call({ q, nextPageToken, fresh, timeout: left() });
        return { ...out, requests: 2, calls: out.cached ? 1 : 2 };
      }
      throw e;
    }
  }

  // The answer we already have for this query, if it found jobs. Never calls the service.
  async function peek({ q, nextPageToken }) {
    const hit = cache && (await cache.get(keyOf(paramsOf({ q, nextPageToken }))));
    return hit && hit.jobs_results.length ? { data: hit, cached: true, requests: 1, calls: 0 } : null;
  }

  async function call({ q, nextPageToken, fresh, noLocation = false, timeout = timeoutMs }) {
    if (timeout < 1000) throw new SearchApiError(`${label} took too long to answer`, 504);
    const params = paramsOf({ q, nextPageToken, noLocation });
    const key = keyOf(params);
    const hit = cache && !fresh && (await cache.get(key));
    if (hit) return { data: hit, cached: true };

    const url = new URL(baseUrl);
    for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
    const headers = { accept: 'application/json' };
    dialect.sign(url, headers, apiKey);
    let res, data;
    try {
      res = await fetchImpl(url, { signal: AbortSignal.timeout(timeout), headers });
      // A refusal may come without JSON (an HTML error page); its status still tells us why.
      data = await res.json().catch((e) => { if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw e; return null; });
    } catch (e) {
      throw new SearchApiError(e.name === 'TimeoutError' ? `${label} took too long to answer` : `Could not reach ${label} (${e.message})`, 502);
    }
    // 429 means "too many requests this hour" or "no credits left": the student sees "busy".
    const status = res.status === 429 ? 429 : 502;
    if (data && data.error) {
      if (NO_RESULTS.test(data.error)) data = {};
      else throw new SearchApiError(`${label}: ${data.error}`, status, res.status);
    } else if (!res.ok || !data) {
      throw new SearchApiError(`${label} answered HTTP ${res.status}`, status, res.status);
    }
    const slim = { jobs_results: dialect.jobs(data), next_page_token: dialect.nextToken(data) };
    if (cache) await cache.set(key, slim);
    return { data: slim, cached: false };
  }
  return { id: provider, label, jobs, peek };
}

// The service says no to this key: no credits left, too many requests this hour, or a bad key.
const REFUSED = new Set([401, 402, 403, 429]);

// Uses the search services in order. When one refuses or can't be reached, the same query goes to
// the next one, and a service that refused is left alone for a while (restMs) so later queries
// don't wait for it. With a single service this behaves exactly like that service.
export function createSearchChain(clients, { restMs = 10 * 60e3, now = () => Date.now() } = {}) {
  const restUntil = new Map();
  // A page token only works at the service that issued it, so it carries the service's name.
  const tag = (c, r) => ({ ...r, provider: c.id, data: r.data.next_page_token ? { ...r.data, next_page_token: `${c.id}:${r.data.next_page_token}` } : r.data });

  async function jobs(args) {
    if (!clients.length) throw new SearchApiError('Search is not set up: add SEARCHAPI_KEY or SERPAPI_KEY to .env', 503);
    if (args.nextPageToken) {
      const cut = String(args.nextPageToken).indexOf(':');
      const c = clients.find((x) => x.id === String(args.nextPageToken).slice(0, cut));
      if (!c) throw new SearchApiError('That page of results belongs to a search service that is no longer set up', 502);
      return tag(c, await c.jobs({ ...args, nextPageToken: String(args.nextPageToken).slice(cut + 1) }));
    }
    // An answer any of the services already gave is as good as a new one, and it costs nothing.
    if (!args.fresh) {
      for (const c of clients) { const hit = await c.peek(args); if (hit) return tag(c, hit); }
    }
    const awake = clients.filter((c) => (restUntil.get(c.id) || 0) <= now());
    const errors = [];
    for (const c of awake.length ? awake : clients) {
      try {
        return tag(c, await c.jobs(args));
      } catch (e) {
        if (!(e instanceof SearchApiError)) throw e;
        errors.push(e);
        if (REFUSED.has(e.upstream)) {
          restUntil.set(c.id, now() + restMs);
          if (clients.length > 1) console.warn(`[search] ${e.message} (HTTP ${e.upstream}). Leaving ${c.label} alone for ${Math.round(restMs / 60e3)} min and using the other search service.`);
        }
      }
    }
    // "Busy" (429) is the more useful answer when one service is out of credits and another failed.
    throw errors.find((e) => e.status === 429) || errors[0];
  }
  return { jobs, ids: clients.map((c) => c.id), labels: clients.map((c) => c.label) };
}
