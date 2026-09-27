// SearchApi.io Google Jobs client: https://www.searchapi.io/docs/google-jobs
// One call = one SearchApi request credit (calls served from our cache are free).

export class SearchApiError extends Error {
  constructor(message, status) { super(message); this.name = 'SearchApiError'; this.status = status; }
}

// SearchApi reports an empty search as an error, e.g. "Google Jobs didn't return any results."
const NO_RESULTS = /(return(ed)?\s+any\s+results|no\s+results|0\s+results)/i;

export function createSearchApi({ apiKey, baseUrl, location, hl, gl, timeoutMs, cache, fetchImpl = fetch }) {
  let useLocation = Boolean(location);
  // Returns { data: { jobs_results, next_page_token }, cached }.
  async function jobs({ q, nextPageToken, fresh = false }) {
    if (!apiKey) throw new SearchApiError('Search is not set up: add SEARCHAPI_KEY to .env', 503);
    try {
      const out = await call({ q, nextPageToken, fresh });
      // Google Jobs sometimes finds nothing for the location filter but does find jobs when the
      // city is in the query itself, so try that once before giving up on this query.
      if (useLocation && !nextPageToken && !out.data.jobs_results.length) {
        const alt = await call({ q, nextPageToken, fresh, noLocation: true });
        if (alt.data.jobs_results.length) return { ...alt, cached: out.cached && alt.cached };
      }
      return out;
    } catch (e) {
      // If SearchApi doesn't recognise the location name, fall back to putting the city in the query.
      if (useLocation && e instanceof SearchApiError && /location/i.test(e.message) && !nextPageToken) {
        console.warn(`[searchapi] location "${location}" was rejected (${e.message}); searching with the city name in the query instead. Set SEARCH_LOCATION in .env to fix.`);
        useLocation = false;
        return call({ q, nextPageToken, fresh });
      }
      throw e;
    }
  }

  async function call({ q, nextPageToken, fresh, noLocation = false }) {
    const params = useLocation && !noLocation ? { engine: 'google_jobs', q, location, hl, gl } : { engine: 'google_jobs', q: `${q} Hồ Chí Minh`, hl, gl };
    if (nextPageToken) params.next_page_token = nextPageToken;
    const key = JSON.stringify(params);
    const hit = cache && !fresh && (await cache.get(key));
    if (hit) return { data: hit, cached: true };

    const url = new URL(baseUrl);
    for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
    let res, data;
    try {
      // The key goes in the Authorization header so it never shows up in URLs or logs.
      res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json', authorization: `Bearer ${apiKey}` } });
      data = await res.json();
    } catch (e) {
      throw new SearchApiError(e.name === 'TimeoutError' ? 'SearchApi took too long to answer' : `Could not reach SearchApi (${e.message})`, 502);
    }
    if (data && data.error) {
      if (NO_RESULTS.test(data.error)) data = { jobs: [] };
      else throw new SearchApiError(`SearchApi: ${data.error}`, res.status === 429 ? 429 : 502);
    } else if (!res.ok) {
      throw new SearchApiError(`SearchApi answered HTTP ${res.status}`, 502);
    }
    const slim = { jobs_results: data.jobs || [], next_page_token: data.pagination?.next_page_token || null };
    if (cache) await cache.set(key, slim);
    return { data: slim, cached: false };
  }
  return { jobs };
}
