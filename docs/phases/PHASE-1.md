# Phase 1: Foundation — completion report

Date: 1 Nov 2026 · Status: **code complete, tests passing; awaiting on-device acceptance with a Supabase project**

## 1. Features completed

| Area | What works |
|---|---|
| Sign-in | Mobile number + 6-digit OTP (default +91, 15 country codes), Indian number validation, resend timer, rate-limit messaging, SMS autofill on iOS/Android |
| Session security | Session encrypted with a per-write AES-256 key held in the OS keystore; foreground-only token refresh; sign out and sign out on all devices |
| Profile | Name capture on first sign-in, edit name later; phone shown read-only |
| Families | Create a family (creator = primary admin), belong to many families, switch between them (remembered across devices), create more |
| Invitations | By mobile number (phone-locked, appears automatically in the invitee's app), by one-time 8-character code, deep link `familyhub://join?code=…`, QR code, SMS composer, share sheet, copy; preview before joining; resend (new code), revoke, decline; 7-day expiry; 20 pending max; brute-force lockout after 10 failed attempts/hour |
| Roles & permissions | Admin, Adult, Viewer (Child role hidden by owner decision and blocked in the database); primary admin + optional secondary admins; per-family permission overrides for non-admin roles; admin-only permissions can never be granted |
| Member management | Change role (with optional reason), remove member (account kept), leave family, transfer primary admin (fresh OTP), delete family (type the name + fresh OTP, soft delete) |
| Audit & activity | Immutable audit log of every change to families, members, invitations and permission overrides (with reasons, secrets stripped); readable family activity feed |
| Home dashboard | Greeting, family switcher, invitations addressed to you, setup checklist, members, pending invitations, activity; widgets can be reordered and hidden per user per family; later-phase widgets listed as upcoming |
| Navigation | Six tabs (Home, Finance, Shopping, Health, Family, More); Quick Add button (live actions only); More lists all 19 modules; unbuilt modules show an honest "arrives in Phase N" screen with no fake controls |
| Design system | Light/dark/system themes, accessible touch targets, loading/empty/error/offline states, confirmation dialogs with optional audit reason or typed confirmation |
| API foundation | NestJS 12: Supabase JWT verification, global auth guard, database-backed `@RequirePermission`, consistent errors, rate limiting, security headers, OpenAPI docs |

## 2. Screens implemented (22)

Sign-in, Verify OTP, Profile setup, Family setup, Join (code + preview), Scan QR, Home, Finance*, Shopping*, Health*, Family, More, Invite (+ invitation ready), Pending invitations, Member detail, Permissions, Audit log, Activity, Family settings, Switch family, Create family, Customise home, Settings, Module info*.
(*honest placeholder for a later phase)

## 3. APIs implemented

**Database RPCs** (all `SECURITY DEFINER`, permission-checked, audited): `create_family`, `my_families`, `change_member_role`, `remove_member`, `leave_family`, `transfer_primary_admin`, `delete_family`, `my_permissions`, `family_permission_matrix`, `set_role_permission`, `get_home_summary`, `create_invitation`, `reissue_invitation`, `revoke_invitation`, `preview_invitation`, `accept_invitation`, `my_pending_invitations`, `accept_invitation_by_id`, `decline_invitation`.

**Direct table access under RLS**: profiles (read co-members, update own), families (read, admins update settings), family_members, family_invitations (no code hashes), family_activity, audit_logs (admins), permission catalog, user_dashboard_layouts (own).

**NestJS REST**: `GET /health`, `GET /health/ready`, `GET /v1/me`, `GET /v1/families`, `GET /v1/families/:familyId/access`, `GET /v1/families/:familyId/audit-access`; docs at `/docs` (non-production).

## 4. Database tables created (11)

`profiles`, `families`, `family_members`, `permissions`, `role_permissions`, `family_role_permissions`, `family_invitations`, `invitation_attempts`, `family_activity`, `audit_logs`, `user_dashboard_layouts`. Migrations: `supabase/migrations/20261101000100…000600`.

## 5. Tests performed — 193 automated tests, all passing

| Suite | Count | Covers |
|---|---:|---|
| Database (`npm run test:db`) | 64 | RLS on every table, no anon access, pinned search paths, cross-family isolation, removed members lose access instantly, profile privacy, invitation hashing/phone lock/expiry/reuse/rate limit/resend/revoke/decline, role and removal rules, hidden Child role (invites, role changes and direct writes blocked), primary-admin protection (RPC + trigger), step-up OTP, soft delete, permission overrides incl. forged rows, audit visibility and immutability, catalog in sync with app code |
| Shared (`packages/shared`) | 59 | Assignable roles, Personal/Family visibility rule, phone normalisation, invite codes and links, permission matrix, dashboard layout merge, module registry, error mapping |
| API (`apps/api`) | 28 | JWT verification (ES256/HS256, expiry, audience, issuer, unknown key, `alg: none`, anon role), auth guard, permission guard, error shape and leakage, security headers, config validation |
| Mobile (`apps/mobile`) | 42 | Session encryption, sign-in validation and OTP request, OTP input, confirmation dialogs, placeholder screens have no actions, activity/audit wording, dates |

Also verified: all workspaces typecheck; the mobile app builds a production bundle; the API compiles, boots and serves health and auth-protected routes; sign-in and OTP screens render correctly in light and dark mode (screenshots); a deliberately weakened RLS policy makes the database suite fail (mutation check).

## 6. Known limitations

1. **Not yet run against a live Supabase project or on a phone.** No backend was reachable from the build environment, so the signed-in screens are verified by typecheck, component tests and the database suite, not by a full end-to-end run. The acceptance checklist below is the first job.
2. **SMS**: only Supabase test numbers (fixed OTPs). Real SMS to Indian numbers needs an SMS provider plus TRAI DLT registration.
3. **Expo Go**: SDK 58 is new; if the store version of Expo Go doesn't support it yet, use a development build (steps below).
4. Membership changes reach other open devices on their next refresh (pull-to-refresh, app focus or within ~30 s), not instantly. Realtime arrives with Phase 4. Server-side access is cut immediately regardless.
5. No child users by design (owner decision). Records about children are kept by a parent as Personal or Family from Phase 2 onwards.
6. Avatars are initials only (photo upload arrives with Storage in Phase 5). Changing your phone number is not supported yet.
7. App updates: Settings shows the installed version and build; update checks and in-app updates are Phase 8.
8. The API is ready but the app doesn't call it yet; Phase 2's finance engine is its first consumer.
9. The API Dockerfile was written but not built here (no Docker daemon in this environment).
10. `.npmrc` sets `legacy-peer-deps=true` to work around an npm crash resolving peer dependencies; revisit when npm fixes it.
11. Supabase types in `packages/shared/src/types.ts` are hand-written; switch to `supabase gen types` once the project exists.

## 7. Pending tasks before Phase 2

- [ ] Create the Supabase project and apply migrations (section 8).
- [ ] Run the app on two phones and complete the acceptance checklist (section 9).
- [x] Decide: children → no child users; Personal or Family records (1 Nov 2026).
- [ ] Decide: hosting region (Mumbai recommended); SMS provider.

## 8. How to run

### Prerequisites
Node.js 22.13+ (or 24.3+), npm 10, a free Supabase account, Expo Go or an Expo account for builds. For DB tests: PostgreSQL 15+ (or Docker).

### 8.1 Install
```bash
git clone https://github.com/jeetyadav-ux/familyhub && cd familyhub
npm install
npm run build:shared
```

### 8.2 Create the backend (Supabase, ~10 minutes)
1. supabase.com → New project → region **South Asia (Mumbai)** → save the database password.
2. Apply the migrations from your computer:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. Dashboard → **Authentication → Sign In / Providers → Phone**: enable it. Choose any SMS provider (Twilio placeholder values are fine while you only use test numbers).
4. In **Test Phone Numbers and OTPs**, add your family's real numbers without the `+`, e.g. `919812345678=482913, 919811111111=731905`, and set **Test OTPs Valid Until** a few weeks ahead. Use different, private codes: anyone who knows a number and its code can sign in.
5. Dashboard → **Project Settings → API**: copy the Project URL and the anon (publishable) key.

### 8.3 Run the app
```bash
cp apps/mobile/.env.example apps/mobile/.env   # paste the URL and anon key
npm run mobile                                  # starts Expo; scan the QR code
```
- **Expo Go**: open the QR code with Expo Go (needs SDK 58 support in the store version).
- **Development build** (works regardless): `cd apps/mobile && npx eas-cli@latest login && npx eas-cli build --profile development --platform android`, install the APK from the link, then `npx expo start --dev-client`. iOS needs an Apple Developer account (US$99/year).
- **Preview build for the family** (no computer needed afterwards): set the two `EXPO_PUBLIC_*` values with `npx eas-cli env:create --environment preview` (visibility: plaintext; they are public by design), then `npx eas-cli build --profile preview --platform android` and share the install link.

### 8.4 Run the API (optional in Phase 1)
```bash
cp apps/api/.env.example apps/api/.env   # same URL and anon key
npm run api                               # http://localhost:3000/health, docs at /docs
```

### 8.5 Run the tests
```bash
npm run typecheck
npm test            # shared + API + mobile
npm run test:db     # needs PostgreSQL at 127.0.0.1:5432 (postgres/postgres), see supabase/tests/README.md
```
CI runs all of these on every push (`.github/workflows/ci.yml`).

## 9. Acceptance checklist (two phones, A and B)

| # | Steps | Expected |
|---|---|---|
| 1 | A: sign in with test number, enter name | Family setup screen |
| 2 | A: create "Test Family" with role label "Father" | Home shows greeting, family name, setup checklist, 1 member, activity "You created the family" |
| 3 | A: Family → Invite, B's number, role Adult → Create | Code + QR shown; "Send by SMS" opens Messages with the text |
| 4 | B: sign in, enter name | Family setup lists A's invitation → Join → B's Home shows the family |
| 5 | A: pull to refresh Home | 2 members; activity "B joined as an adult"; checklist step 1 ticked |
| 6 | B: Family tab | No Invite button; Permissions viewable, switches disabled; no Audit log. A's invite screen offers Adult, Viewer and Admin only |
| 7 | A: Permissions → Adults → Invite members ON. B: refresh | B now sees Invite |
| 8 | A: open B → change to Viewer with a reason | Audit log shows "Role changed: Adult → Viewer" with the reason |
| 9 | A: Invite without a number → share the code. Phone C (or B after step 10) joins via **Join with a code** and via **Scan QR** | Preview shows family, inviter and role, then joins |
| 10 | A: remove B | B on refresh returns to family setup; B's account still signs in |
| 11 | A: Family settings → Delete family → type name | One-time-code sheet appears; after the code, family disappears for everyone |
| 12 | Both: Settings → theme Dark; sign out; sign in again | Theme applies; session survives app restarts until sign out |
