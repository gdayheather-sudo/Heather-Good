-- ============================================================================
-- Clarity SOP — Phase 1 initial schema, RLS, signup trigger
-- ============================================================================
-- Apply via Supabase CLI:
--   supabase db push
-- Or copy/paste into the SQL editor in the Supabase dashboard.
--
-- Notes on design choices (from the build brief):
--   • Organisations exist from day one (multi-tenancy is painful to retrofit).
--     Phase 1 auto-creates one personal org per user on signup.
--   • Steps are rows, not JSON — reorder, photo-attach, future task generation.
--   • Audio timestamps on steps + photos drive photo-to-step auto-matching.
--   • Raw Whisper transcript preserved on the SOP row for audit / re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  stripe_customer_id text,
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'past_due', 'canceled')),
  trial_sops_used int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists organisation_members (
  organisation_id uuid not null references organisations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'owner'
    check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organisation_id, user_id)
);

create table if not exists sops (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  created_by uuid references profiles(id),
  title text not null,
  purpose text,
  prerequisites text,
  estimated_minutes int,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  share_token text unique,
  audio_url text,
  transcript text,
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sops_organisation_id_idx on sops (organisation_id);
create index if not exists sops_created_by_idx on sops (created_by);

create table if not exists sop_steps (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid not null references sops(id) on delete cascade,
  position int not null,
  title text,
  content text not null,
  note text,
  audio_start_seconds numeric,
  audio_end_seconds numeric,
  created_at timestamptz not null default now()
);

create index if not exists sop_steps_sop_id_position_idx on sop_steps (sop_id, position);

create table if not exists sop_photos (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid not null references sops(id) on delete cascade,
  step_id uuid references sop_steps(id) on delete set null,
  storage_path text not null,
  caption text,
  captured_at_seconds numeric,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sop_photos_sop_id_idx on sop_photos (sop_id);
create index if not exists sop_photos_step_id_idx on sop_photos (step_id);

create table if not exists sop_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  sop_id uuid references sops(id) on delete set null,
  audio_duration_seconds numeric,
  transcript_tokens int,
  output_tokens int,
  cost_cents numeric,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- updated_at trigger for sops
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sops_set_updated_at on sops;
create trigger sops_set_updated_at
  before update on sops
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- HELPER: is the current user a member of this org?
-- SECURITY DEFINER avoids recursive RLS evaluation when used inside policies.
-- ----------------------------------------------------------------------------

create or replace function is_org_member(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.organisation_members
    where organisation_id = org_id
      and user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- HELPER: fetch a shared SOP by its share_token (public, no auth).
-- Bundles the SOP + steps + photos in a single JSON payload. RLS is bypassed
-- inside SECURITY DEFINER, so this is the ONLY path through which the anon
-- role can read shared content. Returns null if the token doesn't match.
-- ----------------------------------------------------------------------------

create or replace function get_shared_sop(token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  result jsonb;
begin
  if token is null or length(token) < 16 then
    return null;
  end if;

  select jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'purpose', s.purpose,
    'prerequisites', s.prerequisites,
    'estimated_minutes', s.estimated_minutes,
    'created_at', s.created_at,
    'updated_at', s.updated_at,
    'steps', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', st.id,
            'position', st.position,
            'title', st.title,
            'content', st.content,
            'note', st.note,
            'audio_start_seconds', st.audio_start_seconds,
            'audio_end_seconds', st.audio_end_seconds,
            'photos', coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', p.id,
                    'storage_path', p.storage_path,
                    'caption', p.caption,
                    'position', p.position
                  )
                  order by p.position
                )
                from public.sop_photos p
                where p.step_id = st.id
              ),
              '[]'::jsonb
            )
          )
          order by st.position
        )
        from public.sop_steps st
        where st.sop_id = s.id
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.sops s
  where s.share_token = token
    and s.status <> 'archived';

  return result;
end;
$$;

grant execute on function get_shared_sop(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

alter table profiles               enable row level security;
alter table organisations          enable row level security;
alter table organisation_members   enable row level security;
alter table sops                   enable row level security;
alter table sop_steps              enable row level security;
alter table sop_photos             enable row level security;
alter table sop_generations        enable row level security;

-- PROFILES -------------------------------------------------------------------
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
  on profiles for select
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
  on profiles for insert
  with check (id = auth.uid());

-- ORGANISATIONS --------------------------------------------------------------
drop policy if exists "orgs_select_member" on organisations;
create policy "orgs_select_member"
  on organisations for select
  using (is_org_member(id));

drop policy if exists "orgs_update_owner" on organisations;
create policy "orgs_update_owner"
  on organisations for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "orgs_insert_self" on organisations;
create policy "orgs_insert_self"
  on organisations for insert
  with check (owner_id = auth.uid());

-- ORGANISATION MEMBERS -------------------------------------------------------
drop policy if exists "org_members_select" on organisation_members;
create policy "org_members_select"
  on organisation_members for select
  using (is_org_member(organisation_id));

drop policy if exists "org_members_insert_owner" on organisation_members;
create policy "org_members_insert_owner"
  on organisation_members for insert
  with check (
    exists (
      select 1 from organisations
      where id = organisation_id and owner_id = auth.uid()
    )
  );

drop policy if exists "org_members_delete_owner" on organisation_members;
create policy "org_members_delete_owner"
  on organisation_members for delete
  using (
    exists (
      select 1 from organisations
      where id = organisation_id and owner_id = auth.uid()
    )
  );

-- SOPS -----------------------------------------------------------------------
-- Note: there is intentionally NO public SELECT policy here. Public share
-- access goes through get_shared_sop(token) — see helper above.
drop policy if exists "sops_select_member" on sops;
create policy "sops_select_member"
  on sops for select
  using (is_org_member(organisation_id));

drop policy if exists "sops_insert_member" on sops;
create policy "sops_insert_member"
  on sops for insert
  with check (
    is_org_member(organisation_id)
    and created_by = auth.uid()
  );

drop policy if exists "sops_update_member" on sops;
create policy "sops_update_member"
  on sops for update
  using (is_org_member(organisation_id))
  with check (is_org_member(organisation_id));

drop policy if exists "sops_delete_member" on sops;
create policy "sops_delete_member"
  on sops for delete
  using (is_org_member(organisation_id));

-- SOP STEPS ------------------------------------------------------------------
drop policy if exists "sop_steps_select_member" on sop_steps;
create policy "sop_steps_select_member"
  on sop_steps for select
  using (
    exists (
      select 1 from sops
      where sops.id = sop_steps.sop_id
        and is_org_member(sops.organisation_id)
    )
  );

drop policy if exists "sop_steps_manage_member" on sop_steps;
create policy "sop_steps_manage_member"
  on sop_steps for all
  using (
    exists (
      select 1 from sops
      where sops.id = sop_steps.sop_id
        and is_org_member(sops.organisation_id)
    )
  )
  with check (
    exists (
      select 1 from sops
      where sops.id = sop_steps.sop_id
        and is_org_member(sops.organisation_id)
    )
  );

-- SOP PHOTOS -----------------------------------------------------------------
drop policy if exists "sop_photos_select_member" on sop_photos;
create policy "sop_photos_select_member"
  on sop_photos for select
  using (
    exists (
      select 1 from sops
      where sops.id = sop_photos.sop_id
        and is_org_member(sops.organisation_id)
    )
  );

drop policy if exists "sop_photos_manage_member" on sop_photos;
create policy "sop_photos_manage_member"
  on sop_photos for all
  using (
    exists (
      select 1 from sops
      where sops.id = sop_photos.sop_id
        and is_org_member(sops.organisation_id)
    )
  )
  with check (
    exists (
      select 1 from sops
      where sops.id = sop_photos.sop_id
        and is_org_member(sops.organisation_id)
    )
  );

-- USAGE TRACKING -------------------------------------------------------------
-- Users see their own; writes happen via service role only.
drop policy if exists "sop_generations_select_own" on sop_generations;
create policy "sop_generations_select_own"
  on sop_generations for select
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- SIGNUP TRIGGER
-- On new auth.users row: create profile + personal org + owner membership.
-- SECURITY DEFINER bypasses RLS so the bootstrap completes atomically.
-- ----------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, display_name);

  insert into public.organisations (name, owner_id)
  values (display_name || '''s workspace', new.id)
  returning id into new_org_id;

  insert into public.organisation_members (organisation_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
