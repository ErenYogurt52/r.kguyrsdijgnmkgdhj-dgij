// Loads .env into process.env (existing variables win) and exposes typed settings.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadEnvFile(file = resolve(process.cwd(), '.env')) {
  if (!existsSync(file)) return false;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
  return true;
}

const int = (v, d, min, max) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));

// Career coach providers. Every provider with a key is used, in this order, and the coach falls
// back to the next one when a provider is busy (e.g. Gemini "503 high demand"):
//   Gemini (GEMINI_API_KEY) → Ollama (OLLAMA_MODEL) → OpenRouter (OPENROUTER_API_KEY)
// COACH_PROVIDERS=gemini,openrouter (comma-separated) changes the order or picks a subset.
const LABELS = { gemini: 'Google Gemini API', ollama: 'Ollama on this computer', openrouter: 'OpenRouter' };
function providerConfig(name, env, siteUrl) {
  const timeoutMs = int(env.COACH_TIMEOUT_MS, name === 'ollama' ? 300000 : 120000, 5000, 900000);
  switch (name) {
    case 'gemini': return env.GEMINI_API_KEY ? { provider: name, siteUrl, timeoutMs, apiKey: env.GEMINI_API_KEY, baseUrl: env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai', model: env.GEMINI_MODEL || 'gemini-flash-latest' } : null;
    case 'ollama': return env.OLLAMA_MODEL ? { provider: name, siteUrl, timeoutMs, apiKey: env.OLLAMA_API_KEY || 'ollama', baseUrl: env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1', model: env.OLLAMA_MODEL } : null;
    case 'openrouter': return env.OPENROUTER_API_KEY ? { provider: name, siteUrl, timeoutMs, apiKey: env.OPENROUTER_API_KEY, baseUrl: env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1', model: env.OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free' } : null;
    default: return null;
  }
}
function coachSettings(env) {
  const siteUrl = env.SITE_URL || `http://localhost:${int(env.PORT, 3000, 1, 65535)}`;
  const order = (env.COACH_PROVIDERS || env.COACH_PROVIDER || 'gemini,ollama,openrouter').toLowerCase().split(/[\s,]+/).filter(Boolean);
  const chain = [...new Set(order)].map((n) => providerConfig(n, env, siteUrl)).filter(Boolean);
  const first = chain[0] || { provider: 'none', apiKey: '', model: '' };
  return {
    ...first, chain,
    label: chain.map((c) => `${c.model} (${LABELS[c.provider]})`).join(' → '),
    providerLabel: LABELS[first.provider] || '',
    perUserPerDay: int(env.COACH_MESSAGES_PER_USER_PER_DAY, first.provider === 'ollama' ? 200 : 50, 1, 10000),
  };
}

export function settings(env = process.env) {
  const firebase = {
    apiKey: env.FIREBASE_API_KEY || '',
    authDomain: env.FIREBASE_AUTH_DOMAIN || (env.FIREBASE_PROJECT_ID ? `${env.FIREBASE_PROJECT_ID}.firebaseapp.com` : ''),
    projectId: env.FIREBASE_PROJECT_ID || '',
    appId: env.FIREBASE_APP_ID || '',
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '',
    storageBucket: env.FIREBASE_STORAGE_BUCKET || '',
  };
  return {
    port: int(env.PORT, 3000, 1, 65535),
    host: env.HOST || '127.0.0.1',
    firebase,
    firebaseReady: Boolean(firebase.apiKey && firebase.projectId && firebase.appId),
    requireAuth: bool(env.REQUIRE_AUTH, true),
    streamSearch: bool(env.STREAM_SEARCH, false),
    searchapi: {
      apiKey: env.SEARCHAPI_KEY || '',
      baseUrl: env.SEARCHAPI_BASE_URL || 'https://www.searchapi.io/api/v1/search',
      location: env.SEARCH_LOCATION || 'Ho Chi Minh City,Ho Chi Minh City,Vietnam',
      hl: env.SEARCH_HL || 'en',
      gl: env.SEARCH_GL || 'vn',
      timeoutMs: int(env.SEARCH_TIMEOUT_MS, 30000, 2000, 120000),
    },
    coach: coachSettings(env),
    search: {
      results: int(env.RESULTS_LIMIT, 10, 1, 30),
      maxKeywords: int(env.MAX_KEYWORDS, 3, 1, 5),
      maxCalls: int(env.MAX_API_CALLS_PER_SEARCH, 4, 1, 12),
      perUserPerDay: int(env.SEARCHES_PER_USER_PER_DAY, 20, 1, 1000),
      cacheHours: int(env.CACHE_TTL_HOURS, 12, 0, 168),
      cacheDir: env.CACHE_DIR || resolve(process.cwd(), '.cache'),
    },
  };
}
