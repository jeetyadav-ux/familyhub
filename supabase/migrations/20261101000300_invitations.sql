-- FamilyHub Phase 1: invitations (code, link, QR, SMS composer and phone-addressed invites).
-- Codes are 8 characters from a 31-character alphabet without look-alikes (no I, L, O, 0, 1),
-- shown once to the inviter and stored only as a SHA-256 hash.

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  invited_by uuid references public.profiles (id) on delete set null,
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  role public.family_role not null,
  relationship_label text check (relationship_label is null or char_length(btrim(relationship_label)) between 1 and 30),
  code_hash text not null unique,
  code_hint text not null check (char_length(code_hint) = 2),
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  closed_by uuid references public.profiles (id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index family_invitations_family_status_idx on public.family_invitations (family_id, status);
create index family_invitations_phone_pending_idx on public.family_invitations (phone) where status = 'pending';
create index family_invitations_invited_by_idx on public.family_invitations (invited_by);
create index family_invitations_accepted_by_idx on public.family_invitations (accepted_by);
create index family_invitations_closed_by_idx on public.family_invitations (closed_by);

create trigger family_invitations_set_updated_at
before update on public.family_invitations
for each row execute function app.set_updated_at();

create trigger family_invitations_audit
after insert or update or delete on public.family_invitations
for each row execute function app.audit_row('code_hash');

-- Attempt log for brute-force protection on code lookups.
create table public.invitation_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index invitation_attempts_user_created_idx on public.invitation_attempts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function app.invite_code_alphabet()
returns text
language sql
immutable
set search_path = ''
as $$ select 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'::text $$;

-- Uniform random code using rejection sampling (no modulo bias).
create function app.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet text := app.invite_code_alphabet();
  v_len integer := char_length(v_alphabet);       -- 31
  v_limit integer := 256 - (256 % v_len);          -- 248
  v_code text := '';
  v_bytes bytea;
  v_byte integer;
  i integer;
begin
  while char_length(v_code) < 8 loop
    v_bytes := extensions.gen_random_bytes(16);
    for i in 0 .. 15 loop
      v_byte := get_byte(v_bytes, i);
      if v_byte < v_limit and char_length(v_code) < 8 then
        v_code := v_code || substr(v_alphabet, (v_byte % v_len) + 1, 1);
      end if;
    end loop;
  end loop;
  return v_code;
end;
$$;

-- Accepts "k7qm-4xpa", "K7QM 4XPA", "K7QM4XPA". Returns null if the shape is wrong.
create function app.normalize_invite_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when v ~ ('^[' || app.invite_code_alphabet() || ']{8}$') then v
    else null
  end
  from (select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) as v) s;
$$;

create function app.hash_invite_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(p_code, 'UTF8'), 'sha256'), 'hex');
$$;

create function app.format_invite_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$ select substr(p_code, 1, 4) || '-' || substr(p_code, 5, 4) $$;

create function app.caller_phone()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select p.phone from public.profiles p where p.id = auth.uid() $$;

create function app.mask_phone(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_phone is null then null
              else left(p_phone, 3) || repeat('•', greatest(char_length(p_phone) - 7, 0)) || right(p_phone, 4) end;
$$;

-- 10 failed code lookups per rolling hour per user.
create function app.invite_attempts_exceeded(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) >= 10
    from public.invitation_attempts a
   where a.user_id = p_user_id
     and a.success = false
     and a.created_at > now() - interval '1 hour';
$$;

create function app.record_invite_attempt(p_user_id uuid, p_success boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.invitation_attempts (user_id, success) values (p_user_id, p_success);
$$;

-- Issues a fresh code for an invitation row and returns the plain code (only time it exists).
create function app.issue_invite_code(p_invitation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_attempt integer := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    v_code := app.generate_invite_code();
    begin
      update public.family_invitations
         set code_hash = app.hash_invite_code(v_code),
             code_hint = right(v_code, 2)
       where id = p_invitation_id;
      return v_code;
    exception when unique_violation then
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;
end;
$$;

-- Validates an invitation for the caller. Returns the row or raises a coded error.
create function app.validate_invitation_for_caller(p_invitation public.family_invitations)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_invitation.id is null then
    raise exception 'FH_INVITE_INVALID' using errcode = 'P0001';
  end if;
  if p_invitation.status <> 'pending' then
    raise exception 'FH_INVITE_INVALID' using errcode = 'P0001', detail = 'This invitation is no longer active.';
  end if;
  if p_invitation.expires_at <= now() then
    raise exception 'FH_INVITE_EXPIRED' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.families f where f.id = p_invitation.family_id and f.deleted_at is null) then
    raise exception 'FH_INVITE_INVALID' using errcode = 'P0001';
  end if;
  if p_invitation.phone is not null and p_invitation.phone is distinct from app.caller_phone() then
    raise exception 'FH_INVITE_WRONG_PHONE' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.family_members m
     where m.family_id = p_invitation.family_id and m.user_id = auth.uid() and m.status = 'active'
  ) then
    raise exception 'FH_ALREADY_MEMBER' using errcode = 'P0001';
  end if;
end;
$$;

create function app.join_family_from_invitation(p_invitation public.family_invitations)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  insert into public.family_members (family_id, user_id, role, status, relationship_label, invited_by, joined_at)
  values (p_invitation.family_id, v_uid, p_invitation.role, 'active', p_invitation.relationship_label,
          p_invitation.invited_by, now())
  on conflict (family_id, user_id) do update
     set role = excluded.role,
         status = 'active',
         relationship_label = coalesce(excluded.relationship_label, public.family_members.relationship_label),
         invited_by = excluded.invited_by,
         joined_at = now(),
         removed_at = null,
         removed_by = null;

  update public.family_invitations
     set status = 'accepted', accepted_by = v_uid, accepted_at = now()
   where id = p_invitation.id;

  update public.profiles set last_family_id = p_invitation.family_id where id = v_uid;

  perform app.log_activity(p_invitation.family_id, 'member.joined', 'member', v_uid,
    jsonb_build_object('role', p_invitation.role, 'relationship_label', p_invitation.relationship_label));

  return p_invitation.family_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create function public.create_invitation(
  p_family_id uuid,
  p_role public.family_role,
  p_phone text default null,
  p_relationship_label text default null
)
returns table (invitation_id uuid, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_phone text := nullif(btrim(p_phone), '');
  v_label text := nullif(btrim(p_relationship_label), '');
  v_id uuid;
  v_code text;
  v_expires timestamptz := now() + interval '7 days';
begin
  if not app.has_permission(p_family_id, 'members.invite') then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if p_role is null then
    raise exception 'FH_INVALID_ROLE' using errcode = 'P0001';
  end if;
  if p_role = 'admin' and not app.is_admin(p_family_id) then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001', detail = 'Only admins can invite another admin.';
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'FH_INVALID_PHONE' using errcode = 'P0001';
  end if;
  if v_label is not null and char_length(v_label) > 30 then
    raise exception 'FH_INVALID_INPUT' using errcode = 'P0001', detail = 'Relationship label is too long.';
  end if;
  if v_phone is not null and exists (
    select 1 from public.family_members m join public.profiles p on p.id = m.user_id
     where m.family_id = p_family_id and m.status = 'active' and p.phone = v_phone
  ) then
    raise exception 'FH_ALREADY_MEMBER' using errcode = 'P0001';
  end if;
  if (select count(*) from public.family_invitations i
       where i.family_id = p_family_id and i.status = 'pending' and i.expires_at > now()) >= 20 then
    raise exception 'FH_TOO_MANY_INVITES' using errcode = 'P0001';
  end if;

  -- A new invite for the same phone replaces the previous pending one.
  if v_phone is not null then
    update public.family_invitations i
       set status = 'revoked', closed_by = v_uid, closed_at = now()
     where i.family_id = p_family_id and i.phone = v_phone and i.status = 'pending';
  end if;

  insert into public.family_invitations (family_id, invited_by, phone, role, relationship_label, code_hash, code_hint, expires_at)
  values (p_family_id, v_uid, v_phone, p_role, v_label,
          'pending-' || gen_random_uuid()::text, '--', v_expires)
  returning id into v_id;

  v_code := app.issue_invite_code(v_id);

  perform app.log_activity(p_family_id, 'invitation.created', 'invitation', v_id,
    jsonb_build_object('role', p_role, 'relationship_label', v_label, 'phone_masked', app.mask_phone(v_phone)));

  return query select v_id, app.format_invite_code(v_code), v_expires;
end;
$$;

create function public.reissue_invitation(p_invitation_id uuid)
returns table (invitation_id uuid, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.family_invitations;
  v_code text;
  v_expires timestamptz := now() + interval '7 days';
begin
  perform app.require_user();
  select * into v_inv from public.family_invitations i where i.id = p_invitation_id for update;
  if v_inv.id is null or not app.has_permission(v_inv.family_id, 'members.invite') then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if v_inv.role = 'admin' and not app.is_admin(v_inv.family_id) then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'FH_INVITE_INVALID' using errcode = 'P0001', detail = 'Only pending invitations can be resent.';
  end if;

  update public.family_invitations i set expires_at = v_expires where i.id = p_invitation_id;
  v_code := app.issue_invite_code(p_invitation_id);
  return query select p_invitation_id, app.format_invite_code(v_code), v_expires;
end;
$$;

create function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_inv public.family_invitations;
begin
  select * into v_inv from public.family_invitations i where i.id = p_invitation_id for update;
  if v_inv.id is null or not app.has_permission(v_inv.family_id, 'members.invite') then
    raise exception 'FH_NOT_AUTHORIZED' using errcode = 'P0001';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'FH_INVITE_INVALID' using errcode = 'P0001';
  end if;
  update public.family_invitations i
     set status = 'revoked', closed_by = v_uid, closed_at = now()
   where i.id = p_invitation_id;
end;
$$;

-- Lets someone see what they are about to join. Counts as an attempt only when it fails.
create function public.preview_invitation(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_code text := app.normalize_invite_code(p_code);
  v_inv public.family_invitations;
  v_err text;
begin
  if app.invite_attempts_exceeded(v_uid) then
    return jsonb_build_object('ok', false, 'error', 'FH_RATE_LIMITED');
  end if;

  if v_code is not null then
    select * into v_inv from public.family_invitations i where i.code_hash = app.hash_invite_code(v_code);
  end if;

  begin
    perform app.validate_invitation_for_caller(v_inv);
  exception when others then
    v_err := sqlerrm;
  end;

  if v_err is not null then
    if v_err <> 'FH_ALREADY_MEMBER' then
      perform app.record_invite_attempt(v_uid, false);
    end if;
    return jsonb_build_object('ok', false, 'error', v_err,
      'family_id', case when v_err = 'FH_ALREADY_MEMBER' then v_inv.family_id end);
  end if;

  return jsonb_build_object(
    'ok', true,
    'invitation_id', v_inv.id,
    'family_id', v_inv.family_id,
    'family_name', (select f.name from public.families f where f.id = v_inv.family_id),
    'inviter_name', app.display_name(v_inv.invited_by),
    'role', v_inv.role,
    'relationship_label', v_inv.relationship_label,
    'expires_at', v_inv.expires_at,
    'member_count', (select count(*) from public.family_members m
                      where m.family_id = v_inv.family_id and m.status = 'active')
  );
end;
$$;

create function public.accept_invitation(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_code text := app.normalize_invite_code(p_code);
  v_inv public.family_invitations;
  v_err text;
  v_family uuid;
begin
  if app.invite_attempts_exceeded(v_uid) then
    return jsonb_build_object('ok', false, 'error', 'FH_RATE_LIMITED');
  end if;

  if v_code is not null then
    select * into v_inv from public.family_invitations i
     where i.code_hash = app.hash_invite_code(v_code)
       for update;
  end if;

  begin
    perform app.validate_invitation_for_caller(v_inv);
  exception when others then
    v_err := sqlerrm;
  end;

  if v_err is not null then
    if v_err <> 'FH_ALREADY_MEMBER' then
      perform app.record_invite_attempt(v_uid, false);
    end if;
    return jsonb_build_object('ok', false, 'error', v_err,
      'family_id', case when v_err = 'FH_ALREADY_MEMBER' then v_inv.family_id end);
  end if;

  v_family := app.join_family_from_invitation(v_inv);
  perform app.record_invite_attempt(v_uid, true);
  return jsonb_build_object('ok', true, 'family_id', v_family);
end;
$$;

-- Invitations addressed to the caller's verified phone number (no code needed).
create function public.my_pending_invitations()
returns table (
  invitation_id uuid,
  family_id uuid,
  family_name text,
  inviter_name text,
  role public.family_role,
  relationship_label text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.family_id, f.name, app.display_name(i.invited_by), i.role, i.relationship_label, i.expires_at
    from public.family_invitations i
    join public.families f on f.id = i.family_id and f.deleted_at is null
   where auth.uid() is not null
     and i.phone is not null
     and i.phone = app.caller_phone()
     and i.status = 'pending'
     and i.expires_at > now()
     and not exists (
       select 1 from public.family_members m
        where m.family_id = i.family_id and m.user_id = auth.uid() and m.status = 'active'
     )
   order by i.created_at desc;
$$;

create function public.accept_invitation_by_id(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.family_invitations;
  v_family uuid;
begin
  perform app.require_user();
  select * into v_inv from public.family_invitations i where i.id = p_invitation_id for update;
  -- Only phone-addressed invitations can be accepted by id; others need the code.
  if v_inv.id is null or v_inv.phone is null then
    raise exception 'FH_INVITE_INVALID' using errcode = 'P0001';
  end if;
  perform app.validate_invitation_for_caller(v_inv);
  v_family := app.join_family_from_invitation(v_inv);
  return jsonb_build_object('ok', true, 'family_id', v_family);
end;
$$;

create function public.decline_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_inv public.family_invitations;
begin
  select * into v_inv from public.family_invitations i where i.id = p_invitation_id for update;
  if v_inv.id is null or v_inv.phone is null or v_inv.phone is distinct from app.caller_phone()
     or v_inv.status <> 'pending' then
    raise exception 'FH_INVITE_INVALID' using errcode = 'P0001';
  end if;
  update public.family_invitations i
     set status = 'declined', closed_by = v_uid, closed_at = now()
   where i.id = p_invitation_id;
end;
$$;
