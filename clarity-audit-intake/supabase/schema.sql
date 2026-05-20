-- =============================================================
-- The Clarity Audit — intake schema
-- Run in the Supabase SQL editor.
-- =============================================================

-- ---------- Tables ----------

create table if not exists intake_sessions (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,             -- magic-link token, generated when Heather sends to client
  client_name text,
  client_email text,
  status text not null default 'pending', -- pending | in_progress | submitted | processed | failed
  payment_confirmed boolean default false,
  audit_date timestamptz,                 -- their booked call time
  created_at timestamptz default now(),
  submitted_at timestamptz,
  processed_at timestamptz
);

create table if not exists intake_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references intake_sessions(id) on delete cascade,
  question_id text not null,              -- e.g. 'q1_business'
  input_method text not null,             -- 'voice' | 'text'
  raw_audio_url text,                     -- supabase storage path if voice
  transcript text,                        -- final text (transcribed or typed)
  word_count int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (session_id, question_id)
);

create table if not exists audit_documents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references intake_sessions(id) on delete cascade,
  doc_type text not null,                 -- 'client_summary' | 'internal_prep'
  content_markdown text not null,
  generated_at timestamptz default now()
);

create index if not exists idx_intake_responses_session on intake_responses (session_id);
create index if not exists idx_audit_documents_session on audit_documents (session_id);

-- ---------- Row Level Security ----------
-- The app's API routes use the service-role key (which bypasses RLS) and do
-- their own token-scoping. RLS below is defence-in-depth for any direct
-- anon-key access (e.g. a future client-side Supabase call).

alter table intake_sessions enable row level security;
alter table intake_responses enable row level security;
alter table audit_documents enable row level security;

-- Anonymous clients: token scoping is enforced in the API layer, so we keep
-- anon policies closed by default. Only authenticated admins (Heather) get
-- direct table access here.

drop policy if exists "admin full access sessions" on intake_sessions;
create policy "admin full access sessions" on intake_sessions
  for all to authenticated using (true) with check (true);

drop policy if exists "admin full access responses" on intake_responses;
create policy "admin full access responses" on intake_responses
  for all to authenticated using (true) with check (true);

drop policy if exists "admin full access documents" on audit_documents;
create policy "admin full access documents" on audit_documents
  for all to authenticated using (true) with check (true);

-- Note: audit_documents has NO anon policy — clients can never read generated
-- documents directly. They only receive their summary by email.

-- ---------- Storage ----------
-- Create a private bucket named 'intake-audio' in the Supabase dashboard
-- (Storage → New bucket → uncheck "Public"). Audio is uploaded server-side
-- with the service-role key, so no anon storage policy is required.

-- ---------- updated_at trigger ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_intake_responses_updated_at on intake_responses;
create trigger trg_intake_responses_updated_at
  before update on intake_responses
  for each row execute function set_updated_at();
