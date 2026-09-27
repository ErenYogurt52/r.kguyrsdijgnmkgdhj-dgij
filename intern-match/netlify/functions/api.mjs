// Netlify Function that serves /api/* with the same code as the local server (server/api.js).
// Set the environment variables in Netlify: Site configuration → Environment variables.
import { settings } from '../../server/env.js';
import { createApi } from '../../server/api.js';

const cfg = settings({
  ...process.env,
  STREAM_SEARCH: 'true', // streamed responses may run up to 60 s on Netlify (normal ones ~10 s)
  CACHE_DIR: process.env.CACHE_DIR || '/tmp/intern-match-cache', // only /tmp is writable
  OLLAMA_MODEL: '', // Netlify can't reach Ollama on your computer: the coach uses Gemini or OpenRouter here
});
const api = createApi(cfg);

export default async (request) => api(request);

export const config = { path: '/api/*' };
