-- Clarity Hub: initial schema
-- Run via Supabase SQL editor or `supabase db push`.

-- =========================================================
-- profiles
-- =========================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  business_name text,
  default_brand_voice text,
  created_at timestamptz default now()
);

-- =========================================================
-- kits  (Onboarding Builder module)
-- =========================================================
create table if not exists public.kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null default 'Untitled onboarding kit',
  inputs jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','generating','generated','error')),
  is_unlocked boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists kits_user_id_idx on public.kits (user_id, created_at desc);

-- =========================================================
-- kit_artifacts
-- =========================================================
create table if not exists public.kit_artifacts (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid references public.kits on delete cascade not null,
  artifact_type text not null check (artifact_type in (
    'welcome_email_1','welcome_email_2','welcome_email_3','welcome_email_4',
    'intake_form','kickoff_checklist','onboarding_timeline')),
  content jsonb not null default '{}'::jsonb,
  position int not null default 0,
  updated_at timestamptz default now(),
  unique (kit_id, artifact_type)
);

-- =========================================================
-- purchases (one row per Stripe purchase; product discriminator
-- supports a future Clarity Hub Pass without schema change)
-- =========================================================
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  product text not null default 'onboarding_builder',
  credits_total int not null default 3,
  credits_used int not null default 0,
  amount_cents int,
  created_at timestamptz default now()
);

create index if not exists purchases_user_product_idx
  on public.purchases (user_id, product);

-- =========================================================
-- generations (cost + abuse tracking)
-- =========================================================
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  kit_id uuid references public.kits on delete set null,
  model text,
  input_tokens int,
  output_tokens int,
  created_at timestamptz default now()
);

-- =========================================================
-- updated_at triggers
-- =========================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists kits_touch on public.kits;
create trigger kits_touch before update on public.kits
  for each row execute function public.touch_updated_at();

drop trigger if exists kit_artifacts_touch on public.kit_artifacts;
create trigger kit_artifacts_touch before update on public.kit_artifacts
  for each row execute function public.touch_updated_at();

-- =========================================================
-- auto-create profile on signup
-- =========================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
