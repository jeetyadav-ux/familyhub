-- Minimal emulation of the Supabase platform pieces our migrations rely on,
-- so database tests can run against a plain PostgreSQL 15+ server.
-- NOT a migration: hosted and local Supabase already provide all of this.

-- Roles are cluster-wide, so only create them once.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create schema auth;
create schema extensions;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  phone text unique,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create function auth.uid() returns uuid
language sql stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create function auth.role() returns text
language sql stable
as $$
  select auth.jwt() ->> 'role'
$$;

grant execute on all functions in schema auth to anon, authenticated, service_role;

-- Supabase grants broad default privileges in `public`; RLS is what protects data.
-- We mirror that here so tests prove our migrations lock things down themselves.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
