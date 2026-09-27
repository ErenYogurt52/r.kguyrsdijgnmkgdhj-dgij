import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createVerifier } from '../server/auth.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = publicKey.export({ type: 'spki', format: 'pem' });
const NOW = 1_790_000_000_000;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

function token(payload = {}, header = {}) {
  const sec = Math.floor(NOW / 1000);
  const h = b64({ alg: 'RS256', kid: 'k1', typ: 'JWT', ...header });
  const p = b64({ aud: 'intern-match-demo', iss: 'https://securetoken.google.com/intern-match-demo', sub: 'user-1', iat: sec - 60, exp: sec + 3000, auth_time: sec - 60, email: 'a@b.vn', email_verified: true, ...payload });
  return `${h}.${p}.${sign('RSA-SHA256', Buffer.from(`${h}.${p}`), privateKey).toString('base64url')}`;
}

let fetches = 0;
const verify = createVerifier({ projectId: 'intern-match-demo', now: () => NOW, fetchCerts: async () => { fetches++; return { certs: { k1: pem }, maxAge: 3600 }; } });

test('accepts a valid Firebase ID token', async () => {
  assert.deepEqual(await verify(token()), { uid: 'user-1', email: 'a@b.vn', emailVerified: true });
});

test('rejects expired, foreign, unsigned and tampered tokens', async () => {
  await assert.rejects(verify(token({ exp: Math.floor(NOW / 1000) - 1 })), /expired/);
  await assert.rejects(verify(token({ aud: 'other-project' })), /another Firebase project/);
  await assert.rejects(verify(token({}, { alg: 'none' })), /algorithm/);
  await assert.rejects(verify(token({}, { kid: 'unknown' })), /Unknown signing key/);
  const t = token().split('.');
  const forged = b64({ ...JSON.parse(Buffer.from(t[1], 'base64url')), sub: 'someone-else' });
  await assert.rejects(verify(`${t[0]}.${forged}.${t[2]}`), /signature/);
  await assert.rejects(verify('nope'), /Malformed/);
});

test('caches signing keys', async () => {
  const before = fetches;
  await verify(token()); await verify(token());
  assert.equal(fetches, before);
});
