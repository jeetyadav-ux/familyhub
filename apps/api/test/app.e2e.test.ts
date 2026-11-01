import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { SupabaseJwtVerifier } from '../src/auth/jwt-verifier.js';
import { loadEnv } from '../src/config/env.js';
import { DataAccessError, SupabaseService } from '../src/supabase/supabase.service.js';

const ISSUER = 'https://demo.supabase.co/auth/v1';
const USER_ID = '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f';
const FAMILY_ID = '0b9c8d7e-6f5a-4b3c-9d2e-1f0a9b8c7d6e';

/**
 * The database layer is replaced by a stub here: these tests cover HTTP behaviour
 * (authentication, permission guard, error mapping). Authorization rules themselves
 * are tested against real Postgres in supabase/tests.
 */
const supabase = {
  rpc: vi.fn(),
  getProfile: vi.fn(),
  ping: vi.fn(),
};

let app: INestApplication;
let token: string;
let expiredToken: string;

beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'ES256' };
  const verifier = new SupabaseJwtVerifier({
    issuer: ISSUER,
    audience: 'authenticated',
    jwks: createLocalJWKSet({ keys: [jwk] }),
  });
  const sign = (exp: number | string) =>
    new SignJWT({ sub: USER_ID, role: 'authenticated', phone: '919876543210' })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime(exp)
      .sign(privateKey);
  token = await sign('1h');
  expiredToken = await sign(Math.floor(Date.now() / 1000) - 10);

  const env = loadEnv({
    NODE_ENV: 'test',
    SUPABASE_URL: 'https://demo.supabase.co',
    SUPABASE_ANON_KEY: 'anon-key-for-tests-0123456789',
    RATE_LIMIT_PER_MINUTE: '1000',
  });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot({ env, verifier })] })
    .overrideProvider(SupabaseService)
    .useValue(supabase)
    .compile();
  app = moduleRef.createNestApplication({ logger: false });
  configureApp(app, env);
  await app.init();
});

afterAll(async () => {
  await app?.close();
});

beforeEach(() => {
  supabase.rpc.mockReset();
  supabase.getProfile.mockReset();
  supabase.ping.mockReset();
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('health', () => {
  it('is public', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
  });

  it('reports readiness from Supabase reachability', async () => {
    supabase.ping.mockResolvedValueOnce(true);
    await request(app.getHttpServer()).get('/health/ready').expect(200, { status: 'ready' });
    supabase.ping.mockResolvedValueOnce(false);
    const res = await request(app.getHttpServer()).get('/health/ready').expect(503);
    expect(res.body.error.code).toBe('FH_UPSTREAM_ERROR');
  });

  it('sends security headers', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('authentication', () => {
  it.each([
    ['no header', {}],
    ['a non-bearer header', { Authorization: 'Basic abc' }],
    ['a malformed token', { Authorization: 'Bearer not.a.jwt' }],
  ])('rejects %s', async (_label, headers) => {
    const res = await request(app.getHttpServer()).get('/v1/me').set(headers).expect(401);
    expect(res.body.error.code).toBe('FH_NOT_AUTHENTICATED');
    expect(supabase.getProfile).not.toHaveBeenCalled();
  });

  it('rejects an expired token', async () => {
    const res = await request(app.getHttpServer()).get('/v1/me').set({ Authorization: `Bearer ${expiredToken}` }).expect(401);
    expect(res.body.error).toEqual({ code: 'FH_NOT_AUTHENTICATED', message: 'Token expired' });
  });

  it('returns the user, profile and families for a valid token', async () => {
    supabase.getProfile.mockResolvedValue({ id: USER_ID, display_name: 'Jeet' });
    supabase.rpc.mockResolvedValue([{ family_id: FAMILY_ID, name: 'Yadav Family', role: 'admin' }]);
    const res = await request(app.getHttpServer()).get('/v1/me').set(auth()).expect(200);
    expect(res.body).toEqual({
      user: { id: USER_ID, phone: '+919876543210' },
      profile: { id: USER_ID, display_name: 'Jeet' },
      families: [{ family_id: FAMILY_ID, name: 'Yadav Family', role: 'admin' }],
    });
    // the caller's own token is what reaches the data layer
    expect(supabase.rpc.mock.calls[0]![0]).toMatchObject({ id: USER_ID, accessToken: token });
  });
});

describe('family permission guard', () => {
  it('validates the family id', async () => {
    const res = await request(app.getHttpServer()).get('/v1/families/not-a-uuid/access').set(auth()).expect(400);
    expect(res.body.error.code).toBe('FH_INVALID_INPUT');
  });

  it('refuses non-members', async () => {
    supabase.rpc.mockResolvedValue([]);
    const res = await request(app.getHttpServer()).get(`/v1/families/${FAMILY_ID}/access`).set(auth()).expect(403);
    expect(res.body.error.code).toBe('FH_NOT_AUTHORIZED');
    expect(supabase.rpc).toHaveBeenCalledWith(expect.objectContaining({ id: USER_ID }), 'my_permissions', { p_family_id: FAMILY_ID });
  });

  it('returns permissions for members', async () => {
    supabase.rpc.mockResolvedValue(['finance.view_shared', 'tasks.view']);
    const res = await request(app.getHttpServer()).get(`/v1/families/${FAMILY_ID}/access`).set(auth()).expect(200);
    expect(res.body).toEqual({ familyId: FAMILY_ID, permissions: ['finance.view_shared', 'tasks.view'] });
  });

  it('enforces a specific permission', async () => {
    supabase.rpc.mockResolvedValue(['finance.view_shared']);
    await request(app.getHttpServer()).get(`/v1/families/${FAMILY_ID}/audit-access`).set(auth()).expect(403);
    supabase.rpc.mockResolvedValue(['audit.view']);
    await request(app.getHttpServer()).get(`/v1/families/${FAMILY_ID}/audit-access`).set(auth()).expect(200);
  });

  it('rejects unknown permission keys at startup', async () => {
    const { RequirePermission } = await import('../src/families/family-permission.guard.js');
    expect(() => RequirePermission('made.up')).toThrow(/Unknown permission/);
  });
});

describe('error responses', () => {
  it('maps database error codes to status codes and friendly messages', async () => {
    supabase.rpc.mockRejectedValue(new DataAccessError('FH_NOT_AUTHORIZED', 'FH_NOT_AUTHORIZED', 400));
    const res = await request(app.getHttpServer()).get('/v1/families').set(auth()).expect(403);
    expect(res.body.error).toEqual({
      code: 'FH_NOT_AUTHORIZED',
      message: "You don't have permission to do that in this family.",
    });
  });

  it('hides upstream and internal error details', async () => {
    supabase.rpc.mockRejectedValue(new DataAccessError('relation "secret_table" does not exist', null, 500));
    let res = await request(app.getHttpServer()).get('/v1/families').set(auth()).expect(502);
    expect(JSON.stringify(res.body)).not.toContain('secret_table');

    supabase.rpc.mockRejectedValue(new Error('stack trace with password=hunter2'));
    res = await request(app.getHttpServer()).get('/v1/families').set(auth()).expect(500);
    expect(res.body.error).toEqual({ code: 'FH_INTERNAL', message: 'Something went wrong.' });
  });

  it('uses the same shape for unknown routes', async () => {
    const res = await request(app.getHttpServer()).get('/v1/nope').set(auth()).expect(404);
    expect(res.body.error.code).toBe('FH_NOT_FOUND');
  });
});

describe('configuration', () => {
  it('fails fast on missing settings', () => {
    expect(() => loadEnv({ SUPABASE_URL: 'not a url' })).toThrow(/Invalid API configuration/);
  });
});
