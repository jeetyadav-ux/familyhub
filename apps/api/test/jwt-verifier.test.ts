import { beforeAll, describe, expect, it } from 'vitest';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from 'jose';
import { InvalidTokenError, SupabaseJwtVerifier } from '../src/auth/jwt-verifier.js';

const ISSUER = 'https://demo.supabase.co/auth/v1';
const USER_ID = '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f';
const SECRET = 'super-secret-jwt-token-with-at-least-32-characters';

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let jwks: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair('ES256', { extractable: true });
  const other = await generateKeyPair('ES256', { extractable: true });
  privateKey = pair.privateKey;
  otherPrivateKey = other.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'key-1', alg: 'ES256', use: 'sig' };
  jwks = createLocalJWKSet({ keys: [jwk] });
});

function claims(overrides: Record<string, unknown> = {}) {
  return {
    sub: USER_ID,
    role: 'authenticated',
    phone: '919876543210',
    amr: [{ method: 'otp', timestamp: 1_800_000_000 }],
    ...overrides,
  };
}

async function es256(overrides: Record<string, unknown> = {}, opts: { key?: CryptoKey; exp?: string | number; aud?: string; iss?: string } = {}) {
  return new SignJWT(claims(overrides))
    .setProtectedHeader({ alg: 'ES256', kid: 'key-1' })
    .setIssuer(opts.iss ?? ISSUER)
    .setAudience(opts.aud ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '1h')
    .sign(opts.key ?? privateKey);
}

async function hs256(overrides: Record<string, unknown> = {}, secret = SECRET) {
  return new SignJWT(claims(overrides))
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));
}

const verifier = () => new SupabaseJwtVerifier({ issuer: ISSUER, audience: 'authenticated', jwks });

describe('SupabaseJwtVerifier', () => {
  it('accepts a valid ES256 token and extracts the user', async () => {
    const user = await verifier().verify(await es256());
    expect(user).toMatchObject({ id: USER_ID, phone: '+919876543210', role: 'authenticated', lastAuthAt: 1_800_000_000 });
  });

  it.each([
    ['expired', () => es256({}, { exp: Math.floor(Date.now() / 1000) - 60 }), 'Token expired'],
    ['wrong audience', () => es256({}, { aud: 'anon' }), 'Token verification failed'],
    ['wrong issuer', () => es256({}, { iss: 'https://evil.example/auth/v1' }), 'Token verification failed'],
    ['signed by an unknown key', () => es256({}, { key: otherPrivateKey }), 'Token verification failed'],
    ['for the anon role', () => es256({ role: 'anon' }), 'Token is not for a signed-in user'],
    ['without a user id', () => es256({ sub: 'not-a-uuid' }), 'Token has no user'],
  ])('rejects a token that is %s', async (_label, make, message) => {
    await expect(verifier().verify(await make())).rejects.toThrow(new InvalidTokenError(message));
  });

  it('rejects garbage and unsigned tokens', async () => {
    await expect(verifier().verify('abc')).rejects.toThrow(InvalidTokenError);
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...claims(), iss: ISSUER, aud: 'authenticated' })).toString('base64url');
    await expect(verifier().verify(`${header}.${body}.`)).rejects.toThrow(InvalidTokenError);
  });

  it('rejects HS256 tokens unless a secret is configured', async () => {
    await expect(verifier().verify(await hs256())).rejects.toThrow('HS256 tokens are not accepted');

    const withSecret = new SupabaseJwtVerifier({ issuer: ISSUER, audience: 'authenticated', hs256Secret: SECRET });
    await expect(withSecret.verify(await hs256())).resolves.toMatchObject({ id: USER_ID });
    await expect(withSecret.verify(await hs256({}, 'x'.repeat(40)))).rejects.toThrow('Token verification failed');
    await expect(withSecret.verify(await es256())).rejects.toThrow('Asymmetric tokens are not accepted');
  });

  it('handles tokens without phone or amr', async () => {
    const user = await verifier().verify(await es256({ phone: '', amr: undefined }));
    expect(user.phone).toBeNull();
    expect(user.lastAuthAt).toBeNull();
  });

  it('refuses to start without any key source', () => {
    expect(() => new SupabaseJwtVerifier({ issuer: ISSUER, audience: 'authenticated' })).toThrow();
  });
});
