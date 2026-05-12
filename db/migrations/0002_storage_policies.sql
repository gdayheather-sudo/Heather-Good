-- ============================================================================
-- Clarity SOP — storage bucket policies
-- ============================================================================
-- Prerequisite: create the buckets in the Supabase dashboard first:
--   • sop-audio   (private)
--   • sop-photos  (private)
--
-- Path convention enforced by the app at upload time:
--   {organisation_id}/{sop_id}/{filename}
--
-- Public share access does NOT use direct storage URLs — the server mints
-- short-lived signed URLs after validating the share_token.
-- ============================================================================

-- SOP AUDIO ------------------------------------------------------------------
drop policy if exists "sop_audio_insert_org" on storage.objects;
create policy "sop_audio_insert_org"
  on storage.objects for insert
  with check (
    bucket_id = 'sop-audio'
    and (storage.foldername(name))[1] in (
      select organisation_id::text
      from public.organisation_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "sop_audio_select_org" on storage.objects;
create policy "sop_audio_select_org"
  on storage.objects for select
  using (
    bucket_id = 'sop-audio'
    and (storage.foldername(name))[1] in (
      select organisation_id::text
      from public.organisation_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "sop_audio_delete_org" on storage.objects;
create policy "sop_audio_delete_org"
  on storage.objects for delete
  using (
    bucket_id = 'sop-audio'
    and (storage.foldername(name))[1] in (
      select organisation_id::text
      from public.organisation_members
      where user_id = auth.uid()
    )
  );

-- SOP PHOTOS -----------------------------------------------------------------
drop policy if exists "sop_photos_insert_org" on storage.objects;
create policy "sop_photos_insert_org"
  on storage.objects for insert
  with check (
    bucket_id = 'sop-photos'
    and (storage.foldername(name))[1] in (
      select organisation_id::text
      from public.organisation_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "sop_photos_select_org" on storage.objects;
create policy "sop_photos_select_org"
  on storage.objects for select
  using (
    bucket_id = 'sop-photos'
    and (storage.foldername(name))[1] in (
      select organisation_id::text
      from public.organisation_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "sop_photos_delete_org" on storage.objects;
create policy "sop_photos_delete_org"
  on storage.objects for delete
  using (
    bucket_id = 'sop-photos'
    and (storage.foldername(name))[1] in (
      select organisation_id::text
      from public.organisation_members
      where user_id = auth.uid()
    )
  );
