# Database tests

These tests apply every migration to a fresh PostgreSQL database and check Row Level Security,
RPC rules and invariants as real users would hit them (`authenticated` role with Supabase-style JWT claims).

`bootstrap.sql` recreates the few Supabase pieces the migrations use (`auth.users`, `auth.uid()`,
`auth.jwt()`, the `anon`/`authenticated`/`service_role` roles and Supabase's default grants), so the
tests run against plain PostgreSQL 15+ locally and in CI.

## Run

```bash
# PostgreSQL listening on 127.0.0.1:5432 with user postgres / password postgres
npm run test:db

# or point at another server (the user must be allowed to create databases)
FAMILYHUB_PG_URL=postgres://user:pass@host:5432/postgres npm run test:db
```

The suite drops and recreates the `familyhub_test` database on every run.

## Writing tests

- `asUser(user, fn)` runs SQL inside a transaction as that user; `asUser(null, …)` runs as `anon`.
- `rpc(user, 'fn_name', [args])` and `rpcValue(…)` call public RPCs.
- `sql(…)` runs as the owner (bypasses RLS) for arranging state and checking results.
- `familyWith(owner, [{ user, role }])` builds a family through real invitations.
- Pass `{ authAgeSeconds }` to simulate how long ago the user verified their OTP.
