-- Run once in the Supabase SQL Editor for a new project.
-- Supabase Auth already manages accounts in auth.users.
-- One progress record per user and stage. Photos belong in Supabase Storage.

begin;

create table public.stage_progress (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  stage_id text not null check (stage_id in (
    'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10',
    's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20'
  )),
  done boolean not null default false,
  completed_km numeric not null default 0 check (completed_km >= 0 and completed_km <= 162),
  date_from date,
  date_to date,
  note text not null default '',
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, stage_id),
  constraint stage_progress_distance_limit check (
  completed_km >= 0 and completed_km = trunc(completed_km, 1)
  and completed_km <= case stage_id
    when 'n1' then 110 when 'n2' then 162 when 'n3' then 107
    when 'n4' then 107 when 'n5' then 98 when 'n6' then 92
    when 'n7' then 142 when 'n8' then 58 when 'n9' then 105 when 'n10' then 36.5
    when 's11' then 115.3 when 's12' then 93.5 when 's13' then 116.7
    when 's14' then 110 when 's15' then 87.7 when 's16' then 134
    when 's17' then 81.4 when 's18' then 105 when 's19' then 116 when 's20' then 131
    else 0 end
  ),
  constraint stage_progress_date_order check (
    date_from is null or date_to is null or date_to >= date_from
  )
);

alter table public.stage_progress enable row level security;

revoke all on table public.stage_progress from public, anon, authenticated;
grant select, insert, update, delete on table public.stage_progress to authenticated;

create policy "Read own progress"
  on public.stage_progress for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Insert own progress"
  on public.stage_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Update own progress"
  on public.stage_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Delete own progress"
  on public.stage_progress for delete to authenticated
  using ((select auth.uid()) = user_id);

create function public.set_stage_progress_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    NEW.created_at = now();
  else
    NEW.created_at = OLD.created_at;
  end if;
  NEW.updated_at = now();
  return NEW;
end;
$$;

revoke all on function public.set_stage_progress_timestamps() from public, anon, authenticated;

create trigger stage_progress_timestamps
  before insert or update on public.stage_progress
  for each row execute function public.set_stage_progress_timestamps();

commit;
