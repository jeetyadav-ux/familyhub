import { Inject, Injectable } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENV, type Env } from '../config/env.js';
import type { AuthUser } from '../auth/jwt-verifier.js';

/** Thrown when Supabase returns an error; carries the FH_ code raised by the database when present. */
export class DataAccessError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
    readonly status: number,
  ) {
    super(message);
    this.name = 'DataAccessError';
  }
}

/**
 * Data access for request handlers. Every client is created with the caller's own access
 * token, so Postgres Row Level Security decides what each request can read or change.
 * The service-role key is intentionally not available here.
 */
@Injectable()
export class SupabaseService {
  constructor(@Inject(ENV) private readonly env: Env) {}

  clientFor(user: AuthUser): SupabaseClient {
    return createClient(this.env.SUPABASE_URL, this.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  /** Calls a Postgres RPC as the user and returns its data or throws DataAccessError. */
  async rpc<T>(user: AuthUser, fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error, status } = await this.clientFor(user).rpc(fn, args);
    if (error) {
      const code = /FH_[A-Z_]+/.exec(`${error.message} ${error.code ?? ''}`)?.[0] ?? null;
      throw new DataAccessError(error.message, code, status);
    }
    return data as T;
  }

  async getProfile(user: AuthUser): Promise<Record<string, unknown> | null> {
    const { data, error, status } = await this.clientFor(user)
      .from('profiles')
      .select('id, phone, display_name, avatar_path, timezone, locale, last_family_id, onboarded_at')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw new DataAccessError(error.message, null, status);
    return data;
  }

  /** Reachability check for /health/ready (Supabase Auth health endpoint). */
  async ping(timeoutMs = 3000): Promise<boolean> {
    try {
      const res = await fetch(`${this.env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/health`, {
        headers: { apikey: this.env.SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(timeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
