-- Clarity CRM — Phase 1 schema
-- Core content workflow: content_units -> interviews -> platform_posts, plus cadence_slots.
-- All tables are RLS-protected: a user can only see/edit their own rows.

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at fresh on row updates
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- content_units — one seed idea, tied to exactly one track
-- ---------------------------------------------------------------------------
create table public.content_units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  track text not null check (track in ('linkedin_led', 'substack_article')),
  seed_text text not null,
  topic_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index content_units_user_idx on public.content_units (user_id);
create index content_units_track_idx on public.content_units (track);

-- ---------------------------------------------------------------------------
-- interviews — Claude back-and-forth transcript for a content unit
-- messages: jsonb array of { role: 'user'|'assistant', content: text, timestamp: iso }
-- ---------------------------------------------------------------------------
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  content_unit_id uuid not null references public.content_units on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'complete')),
  created_at timestamptz not null default now()
);

create index interviews_unit_idx on public.interviews (content_unit_id);

-- ---------------------------------------------------------------------------
-- platform_posts — platform-specific outputs of a content unit
-- Track A units produce: linkedin + substack_note + instagram
-- Track B units produce: substack_article only
-- platform is intentionally NOT an enum so new platforms can be added without migration.
-- ---------------------------------------------------------------------------
create table public.platform_posts (
  id uuid primary key default gen_random_uuid(),
  content_unit_id uuid not null references public.content_units on delete cascade,
  platform text not null,
  body text,
  hook_variants text[] not null default '{}',
  graphic_brief text,
  status text not null default 'drafting'
    check (status in ('idea', 'drafting', 'ready', 'scheduled', 'posted')),
  scheduled_for timestamptz,
  posted_at timestamptz,
  posted_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index platform_posts_unit_idx on public.platform_posts (content_unit_id);
create index platform_posts_status_idx on public.platform_posts (status);

create trigger platform_posts_set_updated_at
  before update on public.platform_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- cadence_slots — drives "what's due" / gap detection
-- Times stored in Heather's local timezone (Australia/Brisbane, UTC+10, no DST).
-- day_of_week: 0 = Sunday ... 6 = Saturday
-- ---------------------------------------------------------------------------
create table public.cadence_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  platform text not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  time_of_day time not null,
  active boolean not null default true
);

create index cadence_slots_user_idx on public.cadence_slots (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — owner-only access on every table
-- ---------------------------------------------------------------------------
alter table public.content_units enable row level security;
alter table public.interviews enable row level security;
alter table public.platform_posts enable row level security;
alter table public.cadence_slots enable row level security;

-- content_units: direct ownership via user_id
create policy "content_units owner select" on public.content_units
  for select using (auth.uid() = user_id);
create policy "content_units owner insert" on public.content_units
  for insert with check (auth.uid() = user_id);
create policy "content_units owner update" on public.content_units
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "content_units owner delete" on public.content_units
  for delete using (auth.uid() = user_id);

-- interviews: ownership inherited via parent content_unit
create policy "interviews owner all" on public.interviews
  for all
  using (
    exists (
      select 1 from public.content_units cu
      where cu.id = interviews.content_unit_id and cu.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.content_units cu
      where cu.id = interviews.content_unit_id and cu.user_id = auth.uid()
    )
  );

-- platform_posts: ownership inherited via parent content_unit
create policy "platform_posts owner all" on public.platform_posts
  for all
  using (
    exists (
      select 1 from public.content_units cu
      where cu.id = platform_posts.content_unit_id and cu.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.content_units cu
      where cu.id = platform_posts.content_unit_id and cu.user_id = auth.uid()
    )
  );

-- cadence_slots: direct ownership
create policy "cadence_slots owner all" on public.cadence_slots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed default cadence slots for each new user.
-- Heather's cadence (Brisbane local time):
--   LinkedIn       Sun 17:00, Wed 17:00
--   Instagram      Sun 17:00, Wed 17:00   (same content as LinkedIn)
--   Substack note  Sun 17:00, Wed 17:00   (offshoot of each LinkedIn post)
--   Substack article  Fri 09:30           (standalone weekly, Track B)
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_cadence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cadence_slots (user_id, platform, day_of_week, time_of_day) values
    (new.id, 'linkedin',         0, '17:00'),
    (new.id, 'linkedin',         3, '17:00'),
    (new.id, 'instagram',        0, '17:00'),
    (new.id, 'instagram',        3, '17:00'),
    (new.id, 'substack_note',    0, '17:00'),
    (new.id, 'substack_note',    3, '17:00'),
    (new.id, 'substack_article', 5, '09:30');
  return new;
end;
$$;

create trigger on_auth_user_created_seed_cadence
  after insert on auth.users
  for each row execute function public.seed_default_cadence();
