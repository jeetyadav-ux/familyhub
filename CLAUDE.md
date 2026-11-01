# FamilyHub: working rules

Read `docs/ARCHITECTURE.md` before changing anything. The product spec is `docs/SPEC.md`; progress is tracked in `docs/PROGRESS.md`.

## Non-negotiables
1. Build real functionality. No dummy buttons, hardcoded dashboard numbers, mock data presented as real, or screens that pretend a feature works. A module that is not built yet shows an explicit "arrives in Phase N" state.
2. Never replace a working module with a prototype, and never restart the architecture. Extend it.
3. Every table has RLS enabled. `anon` gets no table access. Every new policy and RPC gets a database test in `supabase/tests`.
4. `SECURITY DEFINER` functions must `set search_path = ''` and fully qualify objects. They check membership/permission themselves.
5. Money uses `numeric(14,2)`. Spend is only ever computed through the shared accounting definition (architecture §5.4).
6. Never store card numbers, CVV, PIN, OTP, passwords, bank credentials or full Aadhaar numbers.
7. Every record is `personal` or `family` (`RECORD_VISIBILITIES`), default `personal`, chosen on every add/edit form (architecture §4.4). Admins never see another member's personal records.
8. There are no child users: the Child role stays hidden (`ASSIGNABLE_ROLES`, `app.role_is_assignable()`) unless the owner decides otherwise.
9. No secrets in the mobile app or in git. Add new variables to the relevant `.env.example`.
10. Ask the user before destructive data operations, and require confirmation in the UI for financial or admin actions.
11. A phase is complete only when its tests pass. Write `docs/phases/PHASE-N.md` and update `docs/PROGRESS.md` at the end of each phase.

## Layout
- `apps/mobile`: Expo SDK 58 (React Native 0.88) + Expo Router + TypeScript; routes in `src/app`
- `apps/api`: NestJS 12 API, ESM, Vitest (verifies Supabase JWTs, queries as the user so RLS applies)
- `packages/shared`: roles, permissions, zod schemas, utilities shared by app and API
- `supabase/migrations`: ordered SQL migrations; `supabase/tests`: DB tests (Vitest + pg)

## Commands
- `npm install` at the repo root installs every workspace.
- `npm run test:db` runs database tests (needs a local Postgres; see `supabase/tests/README.md`).
- `npm run test` runs shared, API and mobile unit tests.
- `npm run typecheck` typechecks every workspace.
- `npm run mobile` starts the Expo dev server.
