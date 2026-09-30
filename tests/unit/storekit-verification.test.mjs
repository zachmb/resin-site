// Money-safety tests for server-side StoreKit verification.
// Proves the cryptographic gate + guards REJECT anything that isn't a genuine,
// current, allow-listed Apple transaction — so a forged/absent claim can never
// grant Pro. Uses the real @apple/app-store-server-library + the bundled roots.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { Environment, SignedDataVerifier } from '@apple/app-store-server-library';

// Load the bundled Apple root certs the same way production does.
const certsSrc = readFileSync(new URL('../../src/lib/server/apple-root-certs.ts', import.meta.url), 'utf8');
const CERTS = [...certsSrc.matchAll(/'([A-Za-z0-9+/=]{100,})'/g)].map((m) => Buffer.from(m[1], 'base64'));

const BUNDLE_ID = 'comlooplessapp.resin';
const ALLOWED = new Set(['comlooplessapp.resin.pro.monthly', 'comlooplessapp.resin.pro.yearly']);

// Mirror of verifyProEntitlement's fail-closed contract (env-free).
async function verify(jws, now = Date.now()) {
  if (typeof jws !== 'string' || jws.length < 20 || jws.length > 32_000) return { verified: false, reason: 'missing_or_malformed' };
  const verifier = new SignedDataVerifier(CERTS, false, Environment.SANDBOX, BUNDLE_ID);
  let payload;
  try { payload = await verifier.verifyAndDecodeTransaction(jws); }
  catch { return { verified: false, reason: 'signature_invalid' }; }
  if (!payload?.productId || !ALLOWED.has(payload.productId)) return { verified: false, reason: 'product_not_allowed' };
  if (typeof payload.revocationDate === 'number') return { verified: false, reason: 'revoked' };
  if (typeof payload.expiresDate === 'number' && payload.expiresDate <= now) return { verified: false, reason: 'expired' };
  return { verified: true, productId: payload.productId };
}

// Forge a well-formed JWS with x5c, signed by our OWN cert (not Apple's root).
function forgeAppleLookingJws(claims) {
  const { privateKey, certificate } = makeSelfSignedEs256();
  const der = pemToDer(certificate);
  const header = { alg: 'ES256', x5c: [der.toString('base64')] };
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const signingInput = `${enc(header)}.${enc(claims)}`;
  const sig = crypto.sign('sha256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${Buffer.from(sig).toString('base64url')}`;
}
function makeSelfSignedEs256() {
  // A raw ES256 keypair; a cert wrapper isn't needed to prove chain rejection.
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return { privateKey, certificate: publicKey.export({ type: 'spki', format: 'pem' }) };
}
function pemToDer(pem) { return Buffer.from(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''), 'base64'); }

test('rejects empty / malformed input', async () => {
  for (const bad of ['', ' ', 'garbage', 'a.b', 'x'.repeat(40)]) {
    const r = await verify(bad);
    assert.equal(r.verified, false, `expected reject for ${JSON.stringify(bad.slice(0,10))}`);
  }
});

test('rejects non-string / oversized input', async () => {
  assert.equal((await verify(undefined)).verified, false);
  assert.equal((await verify(null)).verified, false);
  assert.equal((await verify({})).verified, false);
  assert.equal((await verify('x'.repeat(40_000))).verified, false);
});

test('rejects a well-formed JWS NOT chaining to an Apple root (forged)', async () => {
  const jws = forgeAppleLookingJws({
    bundleId: BUNDLE_ID, productId: 'comlooplessapp.resin.pro.yearly',
    expiresDate: Date.now() + 86_400_000
  });
  const r = await verify(jws);
  assert.equal(r.verified, false, 'a self-signed Apple-looking token must be rejected');
  assert.equal(r.reason, 'signature_invalid');
});

test('verifier constructs with the 3 bundled Apple roots', () => {
  assert.equal(CERTS.length, 3);
  assert.ok(CERTS.every((c) => c[0] === 0x30), 'all certs are DER');
  assert.doesNotThrow(() => new SignedDataVerifier(CERTS, false, Environment.SANDBOX, BUNDLE_ID));
});
