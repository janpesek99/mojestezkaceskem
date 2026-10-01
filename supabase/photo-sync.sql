-- Run after schema.sql (new project) or against the existing stage_progress table.
-- Safe to run again. No service-role key is needed in the browser.
begin;

alter table public.stage_progress
  add column if not exists photo_paths text[] not null default '{}';
alter table public.stage_progress
  add column if not exists completed_km numeric not null default 0
  check (completed_km >= 0 and completed_km <= 162);

alter table public.stage_progress drop constraint if exists stage_progress_distance_limit;
alter table public.stage_progress add constraint stage_progress_distance_limit check (
  completed_km >= 0 and completed_km = trunc(completed_km, 1)
  and completed_km <= case stage_id
    when 'n1' then 110 when 'n2' then 162 when 'n3' then 107
    when 'n4' then 107 when 'n5' then 98 when 'n6' then 92
    when 'n7' then 142 when 'n8' then 58 when 'n9' then 105 when 'n10' then 36.5
    when 's11' then 115.3 when 's12' then 93.5 when 's13' then 116.7
    when 's14' then 110 when 's15' then 87.7 when 's16' then 134
    when 's17' then 81.4 when 's18' then 105 when 's19' then 116 when 's20' then 131
    else 0 end
);

-- Merge photo references atomically so a stale device cannot drop newer photos.
-- SECURITY INVOKER preserves the table's existing RLS and permissions.
create or replace function public.save_stage_progress(
  p_stage_id text, p_done boolean, p_completed_km numeric,
  p_date_from date, p_date_to date, p_note text, p_photo_paths text[]
)
returns setof public.stage_progress
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_photo_paths, '{}'::text[])) as photo(path)
    where path is null or path !~ (
      '^' || auth.uid()::text || '/' || p_stage_id || '/[a-f0-9]{64}\.(jpg|png|webp|gif)$'
    )
  ) then
    raise exception 'Invalid photo path' using errcode = '22023';
  end if;
  return query
  insert into public.stage_progress as stored (
    user_id, stage_id, done, completed_km, date_from, date_to, note, photo_paths
  ) values (
    auth.uid(), p_stage_id, p_done, p_completed_km,
    p_date_from, p_date_to, coalesce(p_note, ''),
    array(select distinct path from unnest(coalesce(p_photo_paths, '{}'::text[])) as photo(path) order by path)
  )
  on conflict (user_id, stage_id) do update set
    done = excluded.done, completed_km = excluded.completed_km,
    date_from = excluded.date_from, date_to = excluded.date_to, note = excluded.note,
    photo_paths = array(
      select distinct path from unnest(stored.photo_paths || excluded.photo_paths) as photo(path) order by path
    )
  returning stored.*;
end;
$$;

revoke all on function public.save_stage_progress(text, boolean, numeric, date, date, text, text[]) from public, anon;
grant execute on function public.save_stage_progress(text, boolean, numeric, date, date, text, text[]) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stage-photos', 'stage-photos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Read own stage photos" on storage.objects;
create policy "Read own stage photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'stage-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Upload own stage photos" on storage.objects;
create policy "Upload own stage photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'stage-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] in (
      'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10',
      's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20'
    )
  );

-- Content-addressed uploads use upsert so retries don't create duplicates.
drop policy if exists "Update own stage photos" on storage.objects;
create policy "Update own stage photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'stage-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'stage-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] in (
      'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10',
      's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20'
    )
  );

commit;
