# Database migrations

Plain SQL files, numbered and applied in order. Phase 1 keeps it simple — no
ORM, no migration framework. Apply via either:

**Supabase CLI** (preferred when working locally):

```bash
supabase db push
```

…or paste each file in turn into the SQL editor in the Supabase dashboard.

## Files

- `0001_init.sql` — schema, RLS, helper functions (`is_org_member`,
  `get_shared_sop`), and the signup trigger that auto-creates a profile +
  personal organisation + owner membership.
- `0002_storage_policies.sql` — bucket policies for `sop-audio` and
  `sop-photos`. **Create the buckets in the dashboard first** (both private).

## Design notes

- Public share access goes through the `get_shared_sop(token text)` SQL
  function, not a broad public-SELECT RLS policy. This keeps anon-role
  access scoped to a single, token-validated entry point.
- The signup trigger is `security definer` with `set search_path = ''` — it
  needs to bypass RLS to bootstrap a user atomically, and locking the search
  path prevents the standard hijack vector.
- Photos served from the public `/share/[token]` page use server-minted signed
  URLs, never direct bucket reads.
