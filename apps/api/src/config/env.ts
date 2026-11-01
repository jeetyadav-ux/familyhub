import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** e.g. https://abcd.supabase.co (or http://127.0.0.1:54321 for local Supabase) */
  SUPABASE_URL: z.url(),
  /** Public anon/publishable key. Used with the caller's JWT so RLS applies. */
  SUPABASE_ANON_KEY: z.string().min(20),
  /**
   * Legacy HS256 JWT secret. Only needed for local Supabase or projects not yet on
   * asymmetric signing keys. Hosted projects verify through the JWKS endpoint.
   */
  SUPABASE_JWT_SECRET: z.string().min(32).optional(),
  /** Comma-separated origins allowed by CORS (the web admin, later). Mobile apps don't need CORS. */
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(10).default(120),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid API configuration: ${problems}`);
  }
  return parsed.data;
}

export const ENV = Symbol('ENV');
