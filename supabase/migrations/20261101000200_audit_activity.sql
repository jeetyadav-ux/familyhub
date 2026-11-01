-- FamilyHub Phase 1: audit trail and family activity feed.

-- ---------------------------------------------------------------------------
-- Audit log: immutable record of every change to audited tables.
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  family_id uuid references public.families (id) on delete set null,
  actor_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  changed_fields text[],
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

create index audit_logs_family_created_idx on public.audit_logs (family_id, created_at desc);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id);

-- Trigger arguments (TG_ARGV) list columns that must never be copied into the log.
create function app.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_changed text[];
  v_key text;
  v_family uuid;
  v_reason text := nullif(current_setting('app.audit_reason', true), '');
  i integer;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;

  for i in 0 .. coalesce(tg_nargs, 0) - 1 loop
    v_old := v_old - tg_argv[i];
    v_new := v_new - tg_argv[i];
  end loop;

  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_changed
      from jsonb_object_keys(v_new) as k
     where k <> 'updated_at' and (v_new -> k) is distinct from (v_old -> k);
    if v_changed is null then
      return new;  -- nothing meaningful changed
    end if;
    -- keep only changed fields to make the log readable
    v_old := (select jsonb_object_agg(k, v_old -> k) from unnest(v_changed) as k);
    v_new := (select jsonb_object_agg(k, v_new -> k) from unnest(v_changed) as k);
  end if;

  v_row := coalesce(to_jsonb(new), to_jsonb(old));
  if tg_table_name = 'families' then
    v_family := (v_row ->> 'id')::uuid;
  elsif v_row ? 'family_id' then
    v_family := (v_row ->> 'family_id')::uuid;
  end if;

  insert into public.audit_logs (family_id, actor_id, action, table_name, record_id, old_values, new_values, changed_fields, reason)
  values (
    v_family,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    case when v_row ? 'id' and (v_row ->> 'id') ~ '^[0-9a-f-]{36}$' then (v_row ->> 'id')::uuid end,
    v_old,
    v_new,
    v_changed,
    left(v_reason, 500)
  );

  return coalesce(new, old);
end;
$$;

create trigger families_audit
after insert or update or delete on public.families
for each row execute function app.audit_row();

create trigger family_members_audit
after insert or update or delete on public.family_members
for each row execute function app.audit_row();

create trigger family_role_permissions_audit
after insert or update or delete on public.family_role_permissions
for each row execute function app.audit_row();

-- ---------------------------------------------------------------------------
-- Family activity: curated, human-readable events for the home screen.
-- Names are snapshotted so the feed stays readable after people leave.
-- ---------------------------------------------------------------------------
create table public.family_activity (
  id bigint generated always as identity primary key,
  family_id uuid not null references public.families (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  verb text not null check (verb ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type text,
  entity_id uuid,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index family_activity_family_created_idx on public.family_activity (family_id, created_at desc);
create index family_activity_actor_idx on public.family_activity (actor_id);

create function app.display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(p.display_name), ''), 'A family member')
    from public.profiles p
   where p.id = p_user_id;
$$;

create function app.log_activity(
  p_family_id uuid,
  p_verb text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.family_activity (family_id, actor_id, verb, entity_type, entity_id, data)
  values (
    p_family_id,
    auth.uid(),
    p_verb,
    p_entity_type,
    p_entity_id,
    jsonb_build_object('actor_name', app.display_name(auth.uid())) || coalesce(p_data, '{}'::jsonb)
  );
end;
$$;

-- Renaming the family (a direct, RLS-checked update) shows up in the feed.
create function app.families_activity_on_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deleted_at is null and new.name is distinct from old.name then
    perform app.log_activity(new.id, 'family.renamed', 'family', new.id,
      jsonb_build_object('from', old.name, 'to', new.name));
  end if;
  return new;
end;
$$;

create trigger families_activity_on_update
after update of name on public.families
for each row execute function app.families_activity_on_update();
