// Intern Match local server: serves the web app from public/ and passes /api/* to server/api.js
// (the same API code runs on Netlify as netlify/functions/api.mjs). No npm dependencies.
import http from 'node:http';
import { Readable } from 'node:stream';
import { once } from 'node:events';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize as normPath, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { loadEnvFile, settings } from './env.js';
import { createApi } from './api.js';

const ROOT = resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

function csp(cfg) {
  const authDomain = cfg.firebase.authDomain ? ` https://${cfg.firebase.authDomain}` : '';
  return [
    "default-src 'self'",
    "script-src 'self' https://www.gstatic.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://apis.google.com https://www.gstatic.com",
    `frame-src https://accounts.google.com https://apis.google.com${authDomain}`,
    "base-uri 'none'", "form-action 'self'", "object-src 'none'", "frame-ancestors 'none'",
  ].join('; ');
}

export function createApp(cfg, deps = {}) {
  const api = createApi(cfg, deps);
  const headers = { 'content-security-policy': csp(cfg), 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'cross-origin-opener-policy': 'same-origin-allow-popups' };

  const send = (req, res, status, body, type = 'application/json; charset=utf-8', extra = {}) => {
    let buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const h = { ...headers, 'content-type': type, ...extra };
    if (buf.length > 1024 && /gzip/.test(req.headers['accept-encoding'] || '') && !/image\/png/.test(type)) { buf = gzipSync(buf); h['content-encoding'] = 'gzip'; h.vary = 'accept-encoding'; }
    h['content-length'] = buf.length;
    res.writeHead(status, h);
    res.end(req.method === 'HEAD' ? undefined : buf);
  };
  const fail = (req, res, status, code, message) => send(req, res, status, { error: { code, message } });

  // Node request → web Request → server/api.js → web Response → Node response.
  async function callApi(req, res) {
    const ctrl = new AbortController();
    res.on('close', () => { if (!res.writableEnded) ctrl.abort(new Error('client left')); });
    const h = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) h.set(k, Array.isArray(v) ? v.join(', ') : v);
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(`http://${req.headers.host || 'localhost'}${req.url}`, { method: req.method, headers: h, body: hasBody ? Readable.toWeb(req) : undefined, duplex: 'half', signal: ctrl.signal });
    const response = await api(request);
    const out = { ...headers };
    response.headers.forEach((v, k) => { out[k] = v; });
    res.writeHead(response.status, out);
    if (!response.body || req.method === 'HEAD') return res.end();
    try {
      for await (const chunk of response.body) { if (!res.write(chunk)) await once(res, 'drain'); }
    } catch { /* client left */ }
    res.end();
  }

  async function serveStatic(req, res, pathname) {
    let rel = decodeURIComponent(pathname);
    if (rel === '/' || !extname(rel)) rel = '/index.html';
    const file = normPath(join(ROOT, rel));
    if (!file.startsWith(ROOT + sep)) return fail(req, res, 403, 'forbidden', 'Forbidden');
    try {
      const st = await stat(file);
      if (!st.isFile()) throw new Error('not a file');
      const type = TYPES[extname(file)] || 'application/octet-stream';
      const cacheCtl = extname(file) === '.html' ? 'no-cache' : 'public, max-age=300';
      return send(req, res, 200, await readFile(file), type, { 'cache-control': cacheCtl });
    } catch {
      return fail(req, res, 404, 'not_found', 'Not found');
    }
  }

  return async function handler(req, res) {
    const { pathname } = new URL(req.url, 'http://localhost');
    try {
      if (pathname.startsWith('/api/')) return await callApi(req, res);
      if (req.method !== 'GET' && req.method !== 'HEAD') return fail(req, res, 405, 'method_not_allowed', 'Method not allowed');
      return await serveStatic(req, res, pathname);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) fail(req, res, 500, 'server_error', 'Server error');
    }
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  loadEnvFile();
  const cfg = settings();
  const server = http.createServer(createApp(cfg));
  server.listen(cfg.port, cfg.host, () => {
    console.log(`\n  Intern Match is running at http://${cfg.host === '0.0.0.0' ? 'localhost' : cfg.host}:${cfg.port}\n`);
    if (!cfg.firebaseReady) console.warn('  ! Firebase is not configured: fill FIREBASE_* in .env (see README).');
    if (!cfg.searchapi.apiKey) console.warn('  ! SEARCHAPI_KEY is missing: search will not work until you add it.');
    if (!cfg.coach.apiKey) console.warn('  ! Career coach is off: set GEMINI_API_KEY in .env.');
    else console.log(`  Career coach: ${cfg.coach.label}`);
    if (!cfg.requireAuth) console.warn('  ! REQUIRE_AUTH=false: anyone who can reach this server can spend your SearchApi credits.');
  });
}
