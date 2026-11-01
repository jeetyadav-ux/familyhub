# FamilyHub development progress

| Phase | Scope | Status | Report |
|---|---|---|---|
| 1 | Foundation: auth, families, invitations, roles & permissions, audit, home, navigation, API foundation | ✅ Code complete, 193 tests passing · ⏳ on-device acceptance | [PHASE-1.md](phases/PHASE-1.md) |
| 2 | Core finance: payment sources, categories, merchants, expenses & income, corrections/exclusions, splits, refunds, transfers, reports | Not started | |
| 3 | Budgets & planning: budgets, forecasts, alerts, credit cards, EMI & loans, savings goals | Not started | |
| 4 | Shopping & collaboration: realtime lists, purchase → expense, splitting & settlements, chat, push | Not started | |
| 5 | Vault & resilience: documents, OCR, expiry reminders, archive & recycle bin, audit UI, backup & restore, consent | Not started | |
| 6 | Health & household: medicines & reminders, records, appointments, tasks, calendar, bills, subscriptions | Not started | |
| 7 | More modules: meals, inventory, vehicles, property, travel | Not started | |
| 8 | Intelligence & launch: AI assistant, OCR, email ingestion, Android SMS, Google Sign-In, Drive backup, app updates, security review, store release | Not started | |

## Phase 1 checklist
- [x] Architecture, data model, API and phase plan (`docs/ARCHITECTURE.md`)
- [x] Monorepo (Expo SDK 58 app, NestJS 12 API, shared package, Supabase migrations)
- [x] Database: 11 tables, RLS everywhere, 19 RPCs, audit triggers
- [x] Mobile: 22 screens, design system, light/dark themes
- [x] API: JWT verification, permission guard, health, `/v1/me`, families
- [x] Automated tests: 64 DB + 59 shared + 28 API + 42 mobile
- [x] CI workflow
- [x] Supabase project created and migrations applied (Mumbai, free plan; live smoke test passed)
- [x] Expo project linked to GitHub; first Android preview APK built (1 Nov 2026)
- [x] Phone sign-in enabled with family test numbers (owner)
- [ ] Acceptance checklist on two phones (owner)

## Decisions log
- 2026-11-01: Supabase + NestJS; family-first launch with Supabase test OTP numbers; GitHub repo `jeetyadav-ux/familyhub`.
- 2026-11-01: Went live for family testing: Supabase project `familyhub` (ref `kpnuytpjboptdknnvjrt`, Mumbai `ap-south-1`, free plan) with migrations 000100–000600 applied; EAS project `@jeet.yadav/familyhub` (ID `450997e8-072c-45a4-8f4d-61e802af4d22`) linked to GitHub, base directory `apps/mobile`; Android first (preview APK, internal distribution); iPhone later.
- 2026-11-01: No child users: Child role hidden in the app and blocked in the database (can be re-enabled later). Every record is Personal or Family, starting as Personal; a child's records are kept by a parent.
