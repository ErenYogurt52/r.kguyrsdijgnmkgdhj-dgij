// Verifies Firebase Auth ID tokens without firebase-admin (no service account needed).
// Follows https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
import { createPublicKey, verify as verifySig } from 'node:crypto';

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

export class AuthError extends Error {
  constructor(message) { super(message); this.name = 'AuthError'; }
}

async function fetchGoogleCerts(fetchImpl = fetch) {
  const res = await fetchImpl(CERTS_URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Could not load Firebase signing keys (HTTP ${res.status})`);
  const cc = res.headers.get('cache-control') || '';
  const maxAge = Number((cc.match(/max-age=(\d+)/) || [])[1] || 3600);
  return { certs: await res.json(), maxAge };
}

const b64json = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

export function createVerifier({ projectId, fetchCerts = () => fetchGoogleCerts(), now = () => Date.now() }) {
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required to check sign-ins');
  let cache = { keys: null, until: 0 };

  async function keys(force) {
    if (!force && cache.keys && now() < cache.until) return cache.keys;
    const { certs, maxAge } = await fetchCerts();
    const parsed = {};
    for (const [kid, pem] of Object.entries(certs)) parsed[kid] = createPublicKey(pem);
    cache = { keys: parsed, until: now() + maxAge * 1000 };
    return parsed;
  }

  return async function verifyIdToken(token) {
    if (typeof token !== 'string' || token.length > 4096) throw new AuthError('Missing sign-in token');
    const parts = token.split('.');
    if (parts.length !== 3) throw new AuthError('Malformed sign-in token');
    let header, payload;
    try { header = b64json(parts[0]); payload = b64json(parts[1]); } catch { throw new AuthError('Malformed sign-in token'); }
    if (header.alg !== 'RS256' || !header.kid) throw new AuthError('Unexpected token algorithm');

    let set = await keys(false);
    if (!set[header.kid]) set = await keys(true); // keys rotate; refresh once
    const key = set[header.kid];
    if (!key) throw new AuthError('Unknown signing key');
    const ok = verifySig('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'));
    if (!ok) throw new AuthError('Bad token signature');

    const sec = Math.floor(now() / 1000);
    if (payload.aud !== projectId) throw new AuthError('Token is for another Firebase project');
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new AuthError('Wrong token issuer');
    if (typeof payload.exp !== 'number' || payload.exp <= sec) throw new AuthError('Sign-in expired');
    if (typeof payload.iat !== 'number' || payload.iat > sec + 300) throw new AuthError('Token issued in the future');
    if (payload.auth_time && payload.auth_time > sec + 300) throw new AuthError('Token auth_time in the future');
    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) throw new AuthError('Token has no user');
    return { uid: payload.sub, email: payload.email || null, emailVerified: Boolean(payload.email_verified) };
  };
}
