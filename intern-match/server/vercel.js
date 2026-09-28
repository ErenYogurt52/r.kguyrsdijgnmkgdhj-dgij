// Vercel: the files in api/ are Vercel Functions that all use this handler, which runs the
// same API code as the local server (server/api.js). Static files are served from public/.
// Set the environment variables in Vercel: Project → Settings → Environment Variables.
import { settings } from './env.js';
import { createApi } from './api.js';

const site = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const cfg = settings({
  ...process.env,
  SITE_URL: process.env.SITE_URL || (site ? `https://${site}` : ''),
  STREAM_SEARCH: 'true', // stream the search so partial results arrive even if it runs long
  CACHE_DIR: process.env.CACHE_DIR || '/tmp/intern-match-cache', // only /tmp is writable
  OLLAMA_MODEL: '', // Vercel can't reach Ollama on your computer: the coach uses Gemini or OpenRouter here
});
const api = createApi(cfg);

export const handle = (request) => api(request);
