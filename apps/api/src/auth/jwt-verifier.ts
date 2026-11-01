import { createRemoteJWKSet, decodeProtectedHeader, errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import type { Env } from '../config/env.js';

export interface AuthUser {
  id: string;
  phone: string | null;
  role: string;
  /** The raw bearer token, forwarded to Supabase so RLS applies to API queries. */
  accessToken: string;
  /** Unix seconds of the most recent authentication method (from the `amr` claim). */
  lastAuthAt: number | null;
}

export class InvalidTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export interface JwtVerifierOptions {
  issuer: string;
  audience: string;
  /** Asymmetric keys (ES256/RS256) from the project's JWKS endpoint. */
  jwks?: JWTVerifyGetKey;
  /** Legacy shared secret for HS256 tokens. */
  hs256Secret?: string;
}

/** Verifies Supabase access tokens. Accepts only the configured issuer, audience and algorithms. */
export class SupabaseJwtVerifier {
  private readonly secret?: Uint8Array;

  constructor(private readonly options: JwtVerifierOptions) {
    if (!options.jwks && !options.hs256Secret) {
      throw new Error('SupabaseJwtVerifier needs a JWKS source or an HS256 secret');
    }
    if (options.hs256Secret) this.secret = new TextEncoder().encode(options.hs256Secret);
  }

  static fromEnv(env: Env): SupabaseJwtVerifier {
    const base = env.SUPABASE_URL.replace(/\/+$/, '');
    return new SupabaseJwtVerifier({
      issuer: `${base}/auth/v1`,
      audience: 'authenticated',
      jwks: createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`), {
        cooldownDuration: 30_000,
        cacheMaxAge: 10 * 60_000,
      }),
      hs256Secret: env.SUPABASE_JWT_SECRET,
    });
  }

  async verify(token: string): Promise<AuthUser> {
    if (!token || token.split('.').length !== 3) throw new InvalidTokenError('Malformed token');

    let alg: string | undefined;
    try {
      alg = decodeProtectedHeader(token).alg;
    } catch {
      throw new InvalidTokenError('Malformed token');
    }

    let payload: JWTPayload;
    try {
      if (alg === 'HS256') {
        if (!this.secret) throw new InvalidTokenError('HS256 tokens are not accepted');
        ({ payload } = await jwtVerify(token, this.secret, {
          issuer: this.options.issuer,
          audience: this.options.audience,
          algorithms: ['HS256'],
        }));
      } else {
        if (!this.options.jwks) throw new InvalidTokenError('Asymmetric tokens are not accepted');
        ({ payload } = await jwtVerify(token, this.options.jwks, {
          issuer: this.options.issuer,
          audience: this.options.audience,
          algorithms: ['ES256', 'RS256', 'EdDSA'],
        }));
      }
    } catch (error) {
      if (error instanceof InvalidTokenError) throw error;
      if (error instanceof errors.JWTExpired) throw new InvalidTokenError('Token expired');
      throw new InvalidTokenError('Token verification failed');
    }

    if (typeof payload.sub !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.sub)) {
      throw new InvalidTokenError('Token has no user');
    }
    if (payload.role !== 'authenticated') {
      throw new InvalidTokenError('Token is not for a signed-in user');
    }

    return {
      id: payload.sub,
      phone: typeof payload.phone === 'string' && payload.phone ? `+${payload.phone.replace(/^\+/, '')}` : null,
      role: payload.role,
      accessToken: token,
      lastAuthAt: latestAmrTimestamp(payload.amr),
    };
  }
}

function latestAmrTimestamp(amr: unknown): number | null {
  if (!Array.isArray(amr)) return null;
  const stamps = amr
    .map((e) => (e && typeof e === 'object' ? Number((e as { timestamp?: unknown }).timestamp) : NaN))
    .filter((n) => Number.isFinite(n));
  return stamps.length ? Math.max(...stamps) : null;
}
