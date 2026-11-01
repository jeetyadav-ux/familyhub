-- FamilyHub Phase 1: Row Level Security and privileges.
-- Rule: RLS on every table, no anonymous access, column-level grants for writable columns.

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.family_role_permissions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.family_activity enable row level security;
alter table public.family_invitations enable row level security;
alter table public.invitation_attempts enable row level security;
alter table public.user_dashboard_layouts enable row level security;

-- Start from zero, then grant exactly what the app needs.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema app from public, anon, authenticated;
grant execute on all functions in schema app to service_role;
-- Only the helpers that RLS policies evaluate as the calling user.
grant execute on function
  app.member_role(uuid),
  app.is_member(uuid),
  app.is_admin(uuid),
  app.is_primary_admin(uuid),
  app.role_has_permission(uuid, public.family_role, text),
  app.has_permission(uuid, text),
  app.shares_family_with(uuid)
to authenticated;

-- profiles ------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (display_name, avatar_path, timezone, locale, last_family_id, onboarded_at)
  on public.profiles to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or app.shares_family_with(id));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and (last_family_id is null or app.is_member(last_family_id)));

-- families ------------------------------------------------------------------
grant select on public.families to authenticated;
grant update (name, currency, timezone) on public.families to authenticated;

create policy families_select on public.families
  for select to authenticated
  using (app.is_member(id));

create policy families_update_settings on public.families
  for update to authenticated
  using (app.has_permission(id, 'family.settings'))
  with check (app.has_permission(id, 'family.settings'));

-- family_members ------------------------------------------------------------
-- Read-only for clients; all changes go through RPCs.
grant select on public.family_members to authenticated;

create policy family_members_select on public.family_members
  for select to authenticated
  using (app.is_member(family_id));

-- permission catalog --------------------------------------------------------
grant select on public.permissions, public.role_permissions to authenticated;

create policy permissions_select on public.permissions
  for select to authenticated using (true);

create policy role_permissions_select on public.role_permissions
  for select to authenticated using (true);

grant select on public.family_role_permissions to authenticated;

create policy family_role_permissions_select on public.family_role_permissions
  for select to authenticated
  using (app.is_member(family_id));

-- audit_logs ----------------------------------------------------------------
grant select on public.audit_logs to authenticated;

create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (family_id is not null and app.has_permission(family_id, 'audit.view'));

-- family_activity -----------------------------------------------------------
grant select on public.family_activity to authenticated;

create policy family_activity_select on public.family_activity
  for select to authenticated
  using (app.is_member(family_id));

-- family_invitations --------------------------------------------------------
-- code_hash is deliberately not granted.
grant select (id, family_id, invited_by, phone, role, relationship_label, code_hint, status,
              expires_at, accepted_by, accepted_at, closed_by, closed_at, created_at, updated_at)
  on public.family_invitations to authenticated;

create policy family_invitations_select on public.family_invitations
  for select to authenticated
  using (app.has_permission(family_id, 'members.invite'));

-- invitation_attempts: no client access at all (RLS on, no policies, no grants).

-- user_dashboard_layouts ----------------------------------------------------
grant select, insert, update, delete on public.user_dashboard_layouts to authenticated;

create policy dashboard_layouts_select on public.user_dashboard_layouts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy dashboard_layouts_insert on public.user_dashboard_layouts
  for insert to authenticated
  with check (user_id = (select auth.uid()) and app.is_member(family_id));

create policy dashboard_layouts_update on public.user_dashboard_layouts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and app.is_member(family_id));

create policy dashboard_layouts_delete on public.user_dashboard_layouts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- RPCs callable by signed-in users ------------------------------------------
grant execute on function
  public.create_family(text, text),
  public.my_families(),
  public.change_member_role(uuid, uuid, public.family_role, text),
  public.remove_member(uuid, uuid, text),
  public.leave_family(uuid),
  public.transfer_primary_admin(uuid, uuid),
  public.delete_family(uuid, text),
  public.my_permissions(uuid),
  public.family_permission_matrix(uuid),
  public.set_role_permission(uuid, public.family_role, text, boolean),
  public.get_home_summary(uuid),
  public.create_invitation(uuid, public.family_role, text, text),
  public.reissue_invitation(uuid),
  public.revoke_invitation(uuid),
  public.preview_invitation(text),
  public.accept_invitation(text),
  public.my_pending_invitations(),
  public.accept_invitation_by_id(uuid),
  public.decline_invitation(uuid)
to authenticated;

-- Service role (API background jobs) keeps full access; it bypasses RLS by design.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
