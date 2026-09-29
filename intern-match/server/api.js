// The Intern Match API, written against the web-standard Request/Response so the same code
// runs in the local Node server (server/index.js) and as a Netlify Function (netlify/functions/api.mjs).
//   GET  /api/config   public Firebase web config + feature flags
//   GET  /api/health
//   POST /api/search   { keywords[], profile, fresh? } → top internships from Google Jobs (SearchApi.io)
//   POST /api/coach    { messages[], profile, jobs[] } → streamed career-coach reply (NDJSON)
import { createVerifier, AuthError } from './auth.js';
import { createSearchApi, SearchApiError } from './searchapi.js';
import { createCache, createDailyLimit } from './cache.js';
import { runSearch, cleanKeywords } from './jobs.js';
import { createCoachChain, CoachError, cleanChat, cleanContext, systemPrompt } from './coach.js';
import { AREAS, MODES, JOB_TYPES, FREE_TIMES, SKILL_NAMES } from '../public/js/reference.js';
import { join } from 'node:path';

const pickProfile = (p) => {
  const o = p && typeof p === 'object' ? p : {};
  const arr = (a, allowed, max) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && (!allowed || allowed.includes(x))).slice(0, max) : []);
  return {
    skills: arr(o.skills, null, 30).map((s) => s.slice(0, 60)).filter((s) => SKILL_NAMES.includes(s) || s.length <= 40),
    areas: arr(o.areas, AREAS.map((a) => a.id), 30),
    modes: arr(o.modes, MODES.map((m) => m[0]), 3),
    freeTimes: arr(o.freeTimes, FREE_TIMES.map((t) => t[0]), 4),
    jobType: JOB_TYPES.some(([id]) => id === o.jobType) ? o.jobType : 'any',
  };
};

const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const fail = (status, code, message) => json(status, { error: { code, message } });
const enc = new TextEncoder();

async function readJson(request, max) {
  const text = await request.text();
  if (text.length > max) throw Object.assign(new Error('Request too large'), { status: 413 });
  try { return JSON.parse(text || '{}'); } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

export function createApi(cfg, deps = {}) {
  const cache = deps.cache || createCache({ dir: join(cfg.search.cacheDir, 'searchapi'), ttlMs: cfg.search.cacheHours * 3600e3 });
  const serp = deps.serp || createSearchApi({ ...cfg.searchapi, cache });
  const limiter = deps.limiter || createDailyLimit({ limit: cfg.search.perUserPerDay });
  const coachAi = deps.coach || createCoachChain(cfg.coach.chain || []);
  const coachLimiter = deps.coachLimiter || createDailyLimit({ limit: cfg.coach.perUserPerDay });
  let verify = deps.verifyToken || null;
  if (!verify && cfg.requireAuth && cfg.firebase.projectId) verify = createVerifier({ projectId: cfg.firebase.projectId });
  // On Netlify a normal function stops after ~10 s; a streamed response may run for 60 s.
  const streamSearch = Boolean(cfg.streamSearch);

  async function whoIs(request) {
    if (!cfg.requireAuth) return { uid: 'local-dev' };
    if (!verify) throw new AuthError('Sign-in checks need FIREBASE_PROJECT_ID');
    const m = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
    if (!m) throw new AuthError('Please sign in first');
    return verify(m[1]);
  }
  const unauth = (e) => fail(401, 'unauthenticated', e instanceof AuthError ? e.message : 'Could not check your sign-in');

  async function search(request) {
    let user;
    try { user = await whoIs(request); } catch (e) { return unauth(e); }
    let body;
    try { body = await readJson(request, 32 * 1024); } catch (e) { return fail(e.status || 400, 'bad_request', e.message); }
    const keywords = cleanKeywords(body.keywords, cfg.search.maxKeywords);
    if (!keywords.length) return fail(400, 'no_keywords', 'Add at least one keyword to your profile first.');
    if (!cfg.searchapi.apiKey) return fail(503, 'search_not_configured', 'Search is not set up yet. Please try again later.');
    if (limiter.remaining(user.uid) <= 0) return fail(429, 'daily_limit', `You’ve used today’s ${cfg.search.perUserPerDay} searches. Try again tomorrow.`);

    const work = async (onProgress) => {
      try {
        const out = await runSearch({ keywords, profile: pickProfile(body.profile), serp, limit: cfg.search.results, maxCalls: cfg.search.maxCalls, timeBudgetMs: cfg.search.timeBudgetMs, fresh: body.fresh === true, onProgress });
        if (out.meta.stats.calls > 0) limiter.take(user.uid);
        out.meta.searchedAt = new Date().toISOString();
        out.meta.remainingToday = limiter.remaining(user.uid);
        console.log(`[search] uid=${user.uid.slice(0, 6)}… keywords=${JSON.stringify(keywords)} searchapi=${out.meta.stats.calls} cached=${out.meta.stats.cachedCalls} seen=${out.meta.stats.seen} kept=${out.meta.stats.kept} shown=${out.jobs.length}`);
        return { status: 200, body: out };
      } catch (e) {
        console.error('[search] failed:', e.message);
        // The real reason stays in the server log; the student sees a plain message.
        if (e instanceof SearchApiError) return { status: e.status === 503 ? 503 : e.status === 429 ? 429 : 502, body: { error: { code: 'search_failed', message: e.status === 429 ? 'The job search is busy right now. Please try again in a few minutes.' : 'The job search had a problem. Please try again.' } } };
        return { status: 500, body: { error: { code: 'search_failed', message: 'Something went wrong while searching. Try again.' } } };
      }
    };
    if (!streamSearch) { const r = await work(); return json(r.status, r.body); }
    // Streamed: one JSON line with the list so far after every round, then the final result.
    // If the platform cuts the answer off, the browser uses the last complete line.
    // Blank lines keep the connection alive. Errors arrive as {"error":…} with status 200.
    let timer, open = true;
    const stream = new ReadableStream({
      async start(controller) {
        const send = (text) => { if (open) try { controller.enqueue(enc.encode(text)); } catch { open = false; } };
        timer = setInterval(() => send('\n'), 5000);
        const r = await work((snap) => send(`${JSON.stringify(snap)}\n`));
        clearInterval(timer);
        send(`${JSON.stringify(r.body)}\n`);
        if (open) controller.close();
      },
      cancel() { open = false; clearInterval(timer); },
    });
    return new Response(stream, { status: 200, headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' } });
  }

  // Streams newline-delimited JSON: {"t":"text"} … then {"done":true} or {"error":{…}}.
  async function coach(request) {
    let user;
    try { user = await whoIs(request); } catch (e) { return unauth(e); }
    let body;
    try { body = await readJson(request, 128 * 1024); } catch (e) { return fail(e.status || 400, 'bad_request', e.message); }
    const messages = cleanChat(body.messages);
    if (!messages.length || messages[messages.length - 1].role !== 'user') return fail(400, 'bad_request', 'Send a message first.');
    if (!cfg.coach.apiKey) return fail(503, 'coach_not_configured', 'The coach isn’t available yet. Please check back later.');
    if (coachLimiter.remaining(user.uid) <= 0) return fail(429, 'daily_limit', `You’ve used today’s ${cfg.coach.perUserPerDay} coach messages. Try again tomorrow.`);
    coachLimiter.take(user.uid);

    const abort = new AbortController();
    if (request.signal) request.signal.addEventListener('abort', () => abort.abort(new Error('client left')), { once: true });
    const system = systemPrompt(cleanContext(body));
    // start() runs synchronously, so `controller` is ready before the model is called.
    let controller;
    const stream = new ReadableStream({ start(c) { controller = c; }, cancel() { abort.abort(new Error('client left')); } });
    const push = (obj) => { try { controller.enqueue(enc.encode(`${JSON.stringify(obj)}\n`)); } catch { /* client left */ } };
    const close = () => { try { controller.close(); } catch { /* already closed */ } };
    // Wait for the first piece of text (or an error), so early errors get a proper status code.
    let resolveFirst, sentAny = false;
    const firstEvent = new Promise((ok) => { resolveFirst = ok; });
    coachAi({ system, messages, signal: abort.signal, onText: (t) => { push({ t }); if (!sentAny) { sentAny = true; resolveFirst({ ok: true }); } } })
      .then((text) => {
        if (!text) push({ t: 'Sorry, I couldn’t come up with an answer. Please try asking again.' });
        push({ done: true, remainingToday: coachLimiter.remaining(user.uid) });
        console.log(`[coach] uid=${user.uid.slice(0, 6)}… turns=${messages.length} chars=${text.length}`);
        resolveFirst({ ok: true });
        close();
      }, (e) => {
        if (!abort.signal.aborted) console.error('[coach] failed:', e.message);
        // Students get a plain message; the real reason (which names the AI provider) stays in the server log.
        const code = e instanceof CoachError ? e.code : 'coach_failed';
        const message = code === 'coach_busy' ? 'The coach is busy right now. Please try again in a minute.' : 'The coach had a problem. Please try again.';
        const err = { code, message, status: e instanceof CoachError ? e.status : 500 };
        if (sentAny) push({ error: { code: err.code, message: err.message } });
        resolveFirst({ ok: false, err });
        close();
      });
    const f = await firstEvent;
    if (!f.ok && !sentAny) return fail(f.err.status, f.err.code, f.err.message);
    return new Response(stream, { status: 200, headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
  }

  return async function handle(request) {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/api/health') return json(200, { ok: true, searchReady: Boolean(cfg.searchapi.apiKey), firebaseReady: cfg.firebaseReady, coachReady: Boolean(cfg.coach.apiKey) });
      if (pathname === '/api/config' && (request.method === 'GET' || request.method === 'HEAD')) {
        return json(200, {
          firebase: cfg.firebaseReady ? cfg.firebase : null, searchReady: Boolean(cfg.searchapi.apiKey), results: cfg.search.results, maxKeywords: cfg.search.maxKeywords, perDay: cfg.search.perUserPerDay,
          coachReady: Boolean(cfg.coach.apiKey),
        });
      }
      if (pathname === '/api/search') return request.method === 'POST' ? await search(request) : fail(405, 'method_not_allowed', 'Use POST');
      if (pathname === '/api/coach') return request.method === 'POST' ? await coach(request) : fail(405, 'method_not_allowed', 'Use POST');
      return fail(404, 'not_found', 'Unknown API route');
    } catch (e) {
      console.error(e);
      return fail(500, 'server_error', 'Server error');
    }
  };
}
