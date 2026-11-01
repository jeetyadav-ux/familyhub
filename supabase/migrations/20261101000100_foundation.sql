-- FamilyHub Phase 1: foundation
-- Profiles, families, memberships, permission catalog and authorization helpers.
-- Conventions: see docs/ARCHITECTURE.md §5.1.

create extension if not exists pgcrypto with schema extensions;

-- Internal helpers live in `app`, which is not exposed through the REST API.
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- Never let new objects be reachable by anonymous callers by default.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema app revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.family_role as enum ('admin', 'adult', 'child', 'viewer');
create type public.member_status as enum ('active', 'removed', 'left');
create type public.invitation_status as enum ('pending', 'accepted', 'declined', 'revoked');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Supabase Auth stores phone numbers without the leading '+'. Profiles use E.164.
create function app.normalize_auth_phone(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_phone is null or btrim(p_phone) = '' then null
    when left(p_phone, 1) = '+' then p_phone
    else '+' || p_phone
  end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one per account, mirrors auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 60),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 300),
  timezone text not null default 'Asia/Kolkata' check (char_length(timezone) <= 64),
  locale text not null default 'en-IN' check (char_length(locale) <= 16),
  last_family_id uuid,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function app.set_updated_at();

create function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, app.normalize_auth_phone(new.phone))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function app.handle_new_auth_user();

create function app.handle_auth_phone_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set phone = app.normalize_auth_phone(new.phone)
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_phone_changed
after update of phone on auth.users
for each row
when (old.phone is distinct from new.phone)
execute function app.handle_auth_phone_change();

-- ---------------------------------------------------------------------------
-- Families and memberships
-- ---------------------------------------------------------------------------
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  primary_admin_id uuid not null references public.profiles (id) on delete restrict,
  currency char(3) not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Asia/Kolkata' check (char_length(timezone) <= 64),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null
);

create index families_primary_admin_idx on public.families (primary_admin_id);
create index families_created_by_idx on public.families (created_by);
create index families_deleted_by_idx on public.families (deleted_by);

create trigger families_set_updated_at
before update on public.families
for each row execute function app.set_updated_at();

alter table public.profiles
  add constraint profiles_last_family_fk
  foreign key (last_family_id) references public.families (id) on delete set null;
create index profiles_last_family_idx on public.profiles (last_family_id);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.family_role not null,
  status public.member_status not null default 'active',
  relationship_label text check (relationship_label is null or char_length(btrim(relationship_label)) between 1 and 30),
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_members_unique unique (family_id, user_id)
);

create index family_members_user_active_idx on public.family_members (user_id) where status = 'active';
create index family_members_invited_by_idx on public.family_members (invited_by);
create index family_members_removed_by_idx on public.family_members (removed_by);

create trigger family_members_set_updated_at
before update on public.family_members
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Permission catalog, role defaults and per-family overrides
-- Keep in sync with packages/shared/src/permissions.ts (a DB test enforces it).
-- ---------------------------------------------------------------------------
create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  module text not null,
  label text not null,
  description text not null,
  admin_only boolean not null default false,
  available_from_phase smallint not null check (available_from_phase between 1 and 8)
);

create table public.role_permissions (
  role public.family_role not null,
  permission text not null references public.permissions (key) on delete cascade,
  primary key (role, permission)
);
create index role_permissions_permission_idx on public.role_permissions (permission);

create table public.family_role_permissions (
  family_id uuid not null references public.families (id) on delete cascade,
  role public.family_role not null check (role <> 'admin'),
  permission text not null references public.permissions (key) on delete cascade,
  allowed boolean not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (family_id, role, permission)
);
create index family_role_permissions_permission_idx on public.family_role_permissions (permission);
create index family_role_permissions_updated_by_idx on public.family_role_permissions (updated_by);

insert into public.permissions (key, module, label, description, admin_only, available_from_phase) values
  ('family.settings',          'family',   'Edit family settings',        'Rename the family and change its currency and time zone.', true, 1),
  ('members.invite',           'family',   'Invite members',              'Create, resend and revoke invitations (not for the admin role).', false, 1),
  ('members.change_role',      'family',   'Change member roles',         'Promote or demote members.', true, 1),
  ('members.remove',           'family',   'Remove members',              'Remove a member from the family. Their account is kept.', true, 1),
  ('permissions.manage',       'family',   'Manage permissions',          'Change what adults, children and viewers can do.', true, 1),
  ('audit.view',               'family',   'View audit log',              'See the detailed change history of shared family records.', false, 1),
  ('finance.view_shared',      'finance',  'View shared finances',        'See family expenses, income, accounts and reports.', false, 2),
  ('finance.edit_shared',      'finance',  'Edit shared finances',        'Add, correct, exclude and archive family transactions.', false, 2),
  ('shopping.view',            'shopping', 'View shopping lists',         'See shared shopping lists.', false, 4),
  ('shopping.edit',            'shopping', 'Edit shopping lists',         'Add, edit and complete shopping items.', false, 4),
  ('chat.use',                 'chat',     'Use family chat',             'Read and send messages in family chats.', false, 4),
  ('vault.view_shared',        'vault',    'View shared documents',       'Open documents shared with the family.', false, 5),
  ('vault.upload',             'vault',    'Upload documents',            'Upload documents and photos to shared folders.', false, 5),
  ('records.delete_permanent', 'records',  'Delete records permanently',  'Permanently delete shared records from the recycle bin.', true, 5),
  ('backup.restore_family',    'backup',   'Restore family backup',       'Run a full family restore.', true, 5),
  ('tasks.view',               'tasks',    'View tasks',                  'See family tasks.', false, 6),
  ('tasks.edit',               'tasks',    'Manage tasks',                'Create, assign and edit any family task.', false, 6),
  ('tasks.update_assigned',    'tasks',    'Update own tasks',            'Update the status of tasks assigned to them.', false, 6),
  ('calendar.view',            'calendar', 'View calendar',               'See family events.', false, 6),
  ('calendar.edit',            'calendar', 'Edit calendar',               'Create and edit family events.', false, 6),
  ('bills.edit',               'bills',    'Manage bills',                'Add bills and record payments.', false, 6),
  ('health.view_shared',       'health',   'View shared health info',     'See health information other members chose to share.', false, 6);

insert into public.role_permissions (role, permission) values
  ('adult', 'finance.view_shared'), ('adult', 'finance.edit_shared'),
  ('adult', 'shopping.view'), ('adult', 'shopping.edit'), ('adult', 'chat.use'),
  ('adult', 'vault.view_shared'), ('adult', 'vault.upload'),
  ('adult', 'tasks.view'), ('adult', 'tasks.edit'), ('adult', 'tasks.update_assigned'),
  ('adult', 'calendar.view'), ('adult', 'calendar.edit'), ('adult', 'bills.edit'),
  ('adult', 'health.view_shared'),
  ('child', 'shopping.view'), ('child', 'shopping.edit'), ('child', 'chat.use'),
  ('child', 'tasks.view'), ('child', 'tasks.update_assigned'), ('child', 'calendar.view'),
  ('viewer', 'finance.view_shared'), ('viewer', 'shopping.view'), ('viewer', 'vault.view_shared'),
  ('viewer', 'tasks.view'), ('viewer', 'calendar.view');

-- ---------------------------------------------------------------------------
-- Authorization helpers (used by RLS policies, RPCs and the API)
-- SECURITY DEFINER so policies on family_members do not recurse.
-- ---------------------------------------------------------------------------
create function app.member_role(p_family_id uuid)
returns public.family_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
    from public.family_members m
    join public.families f on f.id = m.family_id
   where m.family_id = p_family_id
     and m.user_id = auth.uid()
     and m.status = 'active'
     and f.deleted_at is null;
$$;

create function app.is_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.member_role(p_family_id) is not null;
$$;

create function app.is_admin(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(app.member_role(p_family_id) = 'admin', false);
$$;

create function app.is_primary_admin(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_admin(p_family_id)
     and exists (
       select 1 from public.families f
        where f.id = p_family_id
          and f.primary_admin_id = auth.uid()
          and f.deleted_at is null
     );
$$;

create function app.role_has_permission(p_family_id uuid, p_role public.family_role, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_role is null then false
    when p_role = 'admin' then exists (select 1 from public.permissions p where p.key = p_permission)
    when exists (select 1 from public.permissions p where p.key = p_permission and p.admin_only) then false
    else coalesce(
      (select o.allowed
         from public.family_role_permissions o
        where o.family_id = p_family_id and o.role = p_role and o.permission = p_permission),
      exists (select 1 from public.role_permissions d where d.role = p_role and d.permission = p_permission)
    )
  end;
$$;

create function app.has_permission(p_family_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.role_has_permission(p_family_id, app.member_role(p_family_id), p_permission);
$$;

-- True when the caller and p_user_id are both active members of at least one live family.
create function app.shares_family_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.family_members me
      join public.family_members other
        on other.family_id = me.family_id
       and other.user_id = p_user_id
       and other.status = 'active'
      join public.families f on f.id = me.family_id and f.deleted_at is null
     where me.user_id = auth.uid()
       and me.status = 'active'
  );
$$;

-- Seconds since the caller last proved possession of their phone (JWT `amr` claim).
-- Used for step-up confirmation of critical actions.
create function app.seconds_since_last_auth()
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce(
    extract(epoch from now())::bigint - max((e ->> 'timestamp')::bigint),
    9223372036854775807
  )
  from jsonb_array_elements(
    case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end
  ) as e
  where jsonb_typeof(e) = 'object' and (e ->> 'timestamp') ~ '^[0-9]+$';
$$;

create function app.require_recent_auth(p_max_age_seconds integer default 600)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if app.seconds_since_last_auth() > p_max_age_seconds then
    raise exception 'FH_REAUTH_REQUIRED' using errcode = 'P0001',
      detail = 'Confirm with a fresh OTP and try again.';
  end if;
end;
$$;

create function app.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'FH_NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;
  return v_uid;
end;
$$;

-- Primary admin invariants (defence in depth; RPCs check these too).
create function app.protect_primary_admin_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.families f
     where f.id = old.family_id and f.primary_admin_id = old.user_id and f.deleted_at is null
  ) and (new.role <> 'admin' or new.status <> 'active') then
    raise exception 'FH_PRIMARY_ADMIN_PROTECTED' using errcode = 'P0001',
      detail = 'Transfer primary admin to someone else first.';
  end if;
  return new;
end;
$$;

create trigger family_members_protect_primary_admin
before update of role, status on public.family_members
for each row execute function app.protect_primary_admin_membership();

create function app.check_primary_admin_is_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.primary_admin_id is distinct from old.primary_admin_id and not exists (
    select 1 from public.family_members m
     where m.family_id = new.id and m.user_id = new.primary_admin_id
       and m.role = 'admin' and m.status = 'active'
  ) then
    raise exception 'FH_INVALID_PRIMARY_ADMIN' using errcode = 'P0001',
      detail = 'The primary admin must be an active admin of the family.';
  end if;
  return new;
end;
$$;

create trigger families_check_primary_admin
before update of primary_admin_id on public.families
for each row execute function app.check_primary_admin_is_admin();
