-- Row Level Security: every table is owner-only on the client.
-- Server-side writes for purchases / generations use the service role key,
-- which bypasses RLS.

alter table public.profiles      enable row level security;
alter table public.kits          enable row level security;
alter table public.kit_artifacts enable row level security;
alter table public.purchases     enable row level security;
alter table public.generations   enable row level security;

-- profiles: owner only
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- kits: owner only
drop policy if exists "own kits" on public.kits;
create policy "own kits" on public.kits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- kit_artifacts: access via owned kit
drop policy if exists "own kit artifacts" on public.kit_artifacts;
create policy "own kit artifacts" on public.kit_artifacts
  for all using (
    exists (select 1 from public.kits k
            where k.id = kit_artifacts.kit_id and k.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.kits k
            where k.id = kit_artifacts.kit_id and k.user_id = auth.uid())
  );

-- purchases: read own only; writes happen server-side via service role
drop policy if exists "read own purchases" on public.purchases;
create policy "read own purchases" on public.purchases
  for select using (auth.uid() = user_id);

-- generations: read own only; writes server-side via service role
drop policy if exists "read own generations" on public.generations;
create policy "read own generations" on public.generations
  for select using (auth.uid() = user_id);
