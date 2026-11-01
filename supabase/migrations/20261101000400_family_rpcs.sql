-- FamilyHub Phase 1: family management RPCs, permissions, dashboard data.

-- ---------------------------------------------------------------------------
-- Per-user dashboard layout (widget order and visibility), per family.
-- ---------------------------------------------------------------------------
create table public.user_dashboard_layouts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  widgets jsonb not null check (jsonb_typeof(widgets) = 'array' and jsonb_array_length(widgets) <= 50),
  updated_at timestamptz not null default now(),
  primary key (user_id, family_id)
);
create index user_dashboard_layouts_family_idx on public.user_dashboard_layouts (family_id);

create trigger user_dashboard_layouts_set_updated_at
before update on public.user_dashboard_layouts
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Family lifecycle
-- ---------------------------------------------------------------------------
create function public.create_family(p_name text, p_relationship_label text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_name text := btrim(coalesce(p_name, ''));
  v_label text := nullif(btrim(p_relationship_label), '');
  v_family uuid;
begin
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.display_name is not null) then
    raise exception 'FH_PROFILE_INCOMPLETE' using errcode = 'P0001';
  end if;
  if char_length(v_name) not between 1 and 60 then
    raise exception 'FH_INVALID_INPUT' using errcode = 'P0001', detail = 'Family name must be 1 to 60 characters.';
  end if;
  if v_label is not null and char_length(v_label) > 30 then
    raise exception 'FH_INVALID_INPUT' using errcode = 'P0001', detail = 'Relationship label is too long.';
  end if;
  if (select count(*) from public.families f
       where f.primary_admin_id = v_uid and f.deleted_at is null) >= 10 then
    raise exception 'FH_TOO_MANY_FAMILIES' using errcode = 'P0001';
  end if;

  insert into public.families (name, primary_admin_id, created_by)
  values (v_name, v_uid, v_uid)
  returning id into v_family;

  insert into public.family_members (family_id, user_id, role, status, relationship_label)
  values (v_family, v_uid, 'admin', 'active', v_label);

  update public.profiles set last_family_id = v_family where id = v_uid;

  perform app.log_activity(v_family, 'family.created', 'family', v_family, jsonb_build_object('name', v_name));
  return v_family;
end;
$$;

create function public.my_families()
returns table (
  family_id uuid,
  name text,
  role public.family_role,
  is_primary_admin boolean,
  member_count bigint,
  currency char(3),
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, f.name, m.role, f.primary_admin_id = m.user_id,
         (select count(*) from public.family_members x where x.family_id = f.id and x.status = 'active'),
         f.currency, m.joined_at
    from public.family_members m
    join public.families f on f.id = m.family_id and f.deleted_at is null
   where m.user_id = auth.uid() and m.status = 'active'
   order by f.name;
$$;

create function public.change_member_role(
  p_family_id uuid,
  p_user_id uuid,
  p_role public.family_role,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_target public.family_members;
begin
  if not app.has_permission(p_family_id, 'members.change_role') then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if p_role is null then
    raise exception 'FH_INVALID_ROLE' using errcode = 'P0001';
  end if;
  if p_user_id = v_uid then
    raise exception 'FH_CANNOT_TARGET_SELF' using errcode = 'P0001';
  end if;

  select * into v_target from public.family_members m
   where m.family_id = p_family_id and m.user_id = p_user_id and m.status = 'active'
     for update;
  if v_target.id is null then
    raise exception 'FH_MEMBER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.families f where f.id = p_family_id and f.primary_admin_id = p_user_id) then
    raise exception 'FH_PRIMARY_ADMIN_PROTECTED' using errcode = 'P0001';
  end if;
  if v_target.role = 'admin' and not app.is_primary_admin(p_family_id) then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001', detail = 'Only the primary admin can change another admin''s role.';
  end if;
  if v_target.role = p_role then
    return;
  end if;

  perform set_config('app.audit_reason', coalesce(left(p_reason, 500), ''), true);
  update public.family_members set role = p_role where id = v_target.id;

  perform app.log_activity(p_family_id, 'member.role_changed', 'member', p_user_id,
    jsonb_build_object('target_name', app.display_name(p_user_id), 'from', v_target.role, 'to', p_role));
end;
$$;

create function public.remove_member(p_family_id uuid, p_user_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_target public.family_members;
begin
  if not app.has_permission(p_family_id, 'members.remove') then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if p_user_id = v_uid then
    raise exception 'FH_CANNOT_TARGET_SELF' using errcode = 'P0001', detail = 'Use "Leave family" instead.';
  end if;

  select * into v_target from public.family_members m
   where m.family_id = p_family_id and m.user_id = p_user_id and m.status = 'active'
     for update;
  if v_target.id is null then
    raise exception 'FH_MEMBER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.families f where f.id = p_family_id and f.primary_admin_id = p_user_id) then
    raise exception 'FH_PRIMARY_ADMIN_PROTECTED' using errcode = 'P0001';
  end if;
  if v_target.role = 'admin' and not app.is_primary_admin(p_family_id) then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001', detail = 'Only the primary admin can remove another admin.';
  end if;

  perform set_config('app.audit_reason', coalesce(left(p_reason, 500), ''), true);
  update public.family_members
     set status = 'removed', removed_at = now(), removed_by = v_uid
   where id = v_target.id;

  update public.profiles set last_family_id = null
   where id = p_user_id and last_family_id = p_family_id;

  perform app.log_activity(p_family_id, 'member.removed', 'member', p_user_id,
    jsonb_build_object('target_name', app.display_name(p_user_id)));
end;
$$;

create function public.leave_family(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
begin
  if not app.is_member(p_family_id) then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.families f where f.id = p_family_id and f.primary_admin_id = v_uid) then
    raise exception 'FH_TRANSFER_REQUIRED' using errcode = 'P0001';
  end if;

  update public.family_members
     set status = 'left', removed_at = now(), removed_by = v_uid
   where family_id = p_family_id and user_id = v_uid and status = 'active';

  update public.profiles set last_family_id = null where id = v_uid and last_family_id = p_family_id;

  perform app.log_activity(p_family_id, 'member.left', 'member', v_uid, '{}'::jsonb);
end;
$$;

create function public.transfer_primary_admin(p_family_id uuid, p_new_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
begin
  if not app.is_primary_admin(p_family_id) then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  perform app.require_recent_auth(600);
  if p_new_admin_id = v_uid then
    raise exception 'FH_CANNOT_TARGET_SELF' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.family_members m
     where m.family_id = p_family_id and m.user_id = p_new_admin_id and m.status = 'active'
  ) then
    raise exception 'FH_MEMBER_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.family_members set role = 'admin'
   where family_id = p_family_id and user_id = p_new_admin_id and role <> 'admin';
  update public.families set primary_admin_id = p_new_admin_id where id = p_family_id;

  perform app.log_activity(p_family_id, 'admin.transferred', 'member', p_new_admin_id,
    jsonb_build_object('target_name', app.display_name(p_new_admin_id)));
end;
$$;

create function public.delete_family(p_family_id uuid, p_confirm_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_name text;
begin
  if not app.is_primary_admin(p_family_id) then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  perform app.require_recent_auth(600);

  select f.name into v_name from public.families f where f.id = p_family_id for update;
  if lower(btrim(coalesce(p_confirm_name, ''))) <> lower(btrim(v_name)) then
    raise exception 'FH_CONFIRMATION_MISMATCH' using errcode = 'P0001';
  end if;

  update public.families set deleted_at = now(), deleted_by = v_uid where id = p_family_id;
  update public.profiles set last_family_id = null where last_family_id = p_family_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
create function public.my_permissions(p_family_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(p.key order by p.key), '{}')
    from public.permissions p
   where app.has_permission(p_family_id, p.key);
$$;

create function public.family_permission_matrix(p_family_id uuid)
returns table (
  permission text,
  module text,
  label text,
  description text,
  admin_only boolean,
  available_from_phase smallint,
  role public.family_role,
  allowed boolean,
  is_default boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_member(p_family_id) then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  return query
    select p.key, p.module, p.label, p.description, p.admin_only, p.available_from_phase, r.role,
           app.role_has_permission(p_family_id, r.role, p.key),
           not exists (select 1 from public.family_role_permissions o
                        where o.family_id = p_family_id and o.role = r.role and o.permission = p.key)
      from public.permissions p
     cross join (values ('admin'::public.family_role), ('adult'), ('child'), ('viewer')) as r(role)
     order by p.available_from_phase, p.module, p.key, r.role;
end;
$$;

create function public.set_role_permission(
  p_family_id uuid,
  p_role public.family_role,
  p_permission text,
  p_allowed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_default boolean;
begin
  if not app.has_permission(p_family_id, 'permissions.manage') then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if p_role is null or p_role = 'admin' then
    raise exception 'FH_INVALID_ROLE' using errcode = 'P0001', detail = 'Admins always have every permission.';
  end if;
  if p_allowed is null then
    raise exception 'FH_INVALID_INPUT' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.permissions p where p.key = p_permission and not p.admin_only) then
    raise exception 'FH_PERMISSION_NOT_GRANTABLE' using errcode = 'P0001';
  end if;

  v_default := exists (select 1 from public.role_permissions d where d.role = p_role and d.permission = p_permission);

  if p_allowed = v_default then
    delete from public.family_role_permissions o
     where o.family_id = p_family_id and o.role = p_role and o.permission = p_permission;
  else
    insert into public.family_role_permissions (family_id, role, permission, allowed, updated_by)
    values (p_family_id, p_role, p_permission, p_allowed, v_uid)
    on conflict (family_id, role, permission)
    do update set allowed = excluded.allowed, updated_by = excluded.updated_by, updated_at = now();
  end if;

  perform app.log_activity(p_family_id, 'permissions.changed', 'permission', null,
    jsonb_build_object('role', p_role, 'permission', p_permission, 'allowed', p_allowed));
end;
$$;

-- ---------------------------------------------------------------------------
-- Home dashboard summary (one round trip; only real data)
-- ---------------------------------------------------------------------------
create function public.get_home_summary(p_family_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_role public.family_role := app.member_role(p_family_id);
  v_can_invite boolean;
  v_family public.families;
begin
  if v_role is null then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  v_can_invite := app.has_permission(p_family_id, 'members.invite');
  select * into v_family from public.families f where f.id = p_family_id;

  return jsonb_build_object(
    'family', jsonb_build_object(
      'id', v_family.id, 'name', v_family.name, 'currency', v_family.currency,
      'timezone', v_family.timezone, 'primary_admin_id', v_family.primary_admin_id,
      'created_at', v_family.created_at),
    'my_role', v_role,
    'is_primary_admin', v_family.primary_admin_id = v_uid,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', m.user_id, 'display_name', p.display_name, 'avatar_path', p.avatar_path,
               'role', m.role, 'relationship_label', m.relationship_label,
               'is_primary_admin', m.user_id = v_family.primary_admin_id)
             order by (m.user_id = v_family.primary_admin_id) desc, m.joined_at)
        from public.family_members m join public.profiles p on p.id = m.user_id
       where m.family_id = p_family_id and m.status = 'active'), '[]'::jsonb),
    'pending_invitations', case when v_can_invite then (
      select count(*) from public.family_invitations i
       where i.family_id = p_family_id and i.status = 'pending' and i.expires_at > now()) end,
    'recent_activity', coalesce((
      select jsonb_agg(a order by a.created_at desc) from (
        select fa.id, fa.verb, fa.actor_id, fa.entity_type, fa.entity_id, fa.data, fa.created_at
          from public.family_activity fa
         where fa.family_id = p_family_id
         order by fa.created_at desc
         limit 10) a), '[]'::jsonb),
    'setup', jsonb_build_object(
      'has_other_members', (select count(*) > 1 from public.family_members m
                             where m.family_id = p_family_id and m.status = 'active'),
      'has_secondary_admin', exists (select 1 from public.family_members m
                                      where m.family_id = p_family_id and m.status = 'active'
                                        and m.role = 'admin' and m.user_id <> v_family.primary_admin_id),
      'has_pending_invitation', exists (select 1 from public.family_invitations i
                                         where i.family_id = p_family_id and i.status = 'pending'
                                           and i.expires_at > now()))
  );
end;
$$;
