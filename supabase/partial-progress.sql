-- Run in Supabase SQL Editor for an existing database.
begin;
alter table public.stage_progress
  add column if not exists completed_km numeric not null default 0
  check (completed_km >= 0 and completed_km <= 162);
commit;