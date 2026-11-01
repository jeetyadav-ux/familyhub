# FamilyHub

A private, all-in-one family app for Android and iOS: finances, budgets, shopping, documents, health, tasks and more, with personal records kept private and shared records visible only to the right family members.

Built in phases on one architecture. **Phase 1 (foundation) is complete**: phone-OTP sign-in, families, invitations, roles and permissions, audit log, home dashboard and navigation. See [docs/PROGRESS.md](docs/PROGRESS.md).

| | |
|---|---|
| Mobile | React Native 0.88 · Expo SDK 58 · Expo Router · TypeScript |
| Backend | Supabase (Postgres with Row Level Security, Auth, Storage, Realtime) · NestJS 12 API |
| Shared | `@familyhub/shared`: roles, permissions, validation, utilities |

## Repository

```
apps/mobile        Expo app (routes in src/app)
apps/api           NestJS API
packages/shared    Shared TypeScript used by app and API
supabase/          Migrations, local config, database tests
docs/              Spec, architecture, progress, phase reports
```

## Quick start

```bash
npm install && npm run build:shared
cp apps/mobile/.env.example apps/mobile/.env   # add your Supabase URL + anon key
npm run mobile
```

Full setup (creating the Supabase project, test phone numbers, development builds) is in [docs/phases/PHASE-1.md](docs/phases/PHASE-1.md#8-how-to-run).

## Tests

```bash
npm run typecheck
npm test          # shared, API, mobile
npm run test:db   # database security tests (PostgreSQL required)
```

## Documents

- [Product spec](docs/SPEC.md)
- [Architecture, data model and phase plan](docs/ARCHITECTURE.md)
- [Progress tracker](docs/PROGRESS.md)
- [Phase 1 report](docs/phases/PHASE-1.md)
- [Rules for contributors](CLAUDE.md)
