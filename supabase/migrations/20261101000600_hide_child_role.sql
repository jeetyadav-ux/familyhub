-- FamilyHub: hide the Child role (owner decision, 1 Nov 2026: FamilyHub has no child users).
-- No new invitation or membership may use 'child'. The enum value and its permission defaults
-- stay, so turning the role back on later is a one-line change to app.role_is_assignable().

create function app.role_is_assignable(p_role public.family_role)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_role <> 'child';
$$;

create function app.enforce_assignable_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not app.role_is_assignable(new.role)
     and (tg_op = 'INSERT' or new.role is distinct from old.role) then
    raise exception 'FH_INVALID_ROLE' using errcode = 'P0001',
      detail = 'This role is not available in FamilyHub.';
  end if;
  return new;
end;
$$;

create trigger family_invitations_assignable_role
before insert or update of role on public.family_invitations
for each row execute function app.enforce_assignable_role();

create trigger family_members_assignable_role
before insert or update of role on public.family_members
for each row execute function app.enforce_assignable_role();

revoke execute on function app.role_is_assignable(public.family_role), app.enforce_assignable_role() from public, anon, authenticated;
grant execute on function app.role_is_assignable(public.family_role), app.enforce_assignable_role() to service_role;
