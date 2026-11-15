-- Aegis Home, Step 6: alerts that reach people, live location while help is on the way,
-- and an automatic check for medicines that were not checked in.
-- Run in the Supabase SQL editor after 0001_core.sql. Safe to run more than once.

-- One alert per missed medicine per day, and a time for the latest location update.
alter table public.alerts add column if not exists dedupe_key text unique;
alter table public.alerts add column if not exists updated_at timestamptz not null default now();

-- The elder may replace today's check-in photo (for example after a retake).
drop policy if exists checkins_update on public.dose_checkins;
create policy checkins_update on public.dose_checkins for update to authenticated
  using (elder_id = auth.uid()) with check (elder_id = auth.uid());
drop policy if exists checkins_files_update on storage.objects;
create policy checkins_files_update on storage.objects for update to authenticated
  using (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text);

-- While an alert is open, the elder's phone keeps its location fresh for the care circle.
create or replace function public.update_alert_location(alert_id uuid, p_lat double precision, p_lng double precision) returns void
language sql security definer set search_path = public as $$
  update alerts set lat = p_lat, lng = p_lng, updated_at = now()
  where id = alert_id and elder_id = auth.uid() and status <> 'resolved';
$$;

-- "I'm safe now" (the elder) or "Resolved" (someone who received the alert).
create or replace function public.resolve_alert(alert_id uuid) returns void
language sql security definer set search_path = public as $$
  update alerts set status = 'resolved', updated_at = now()
  where id = alert_id and status <> 'resolved'
    and (elder_id = auth.uid() or public.is_caretaker_of(elder_id) or auth.uid() = any (recipient_home_ids));
$$;

-- Medicines whose time passed more than 30 minutes ago (India time) with no photo check-in today.
-- Each becomes one alert for the care circle. Safe to run as often as you like.
create or replace function public.check_missed_doses() returns int
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Kolkata')::date;
  made int;
begin
  insert into alerts (elder_id, kind, message, dedupe_key)
  select m.elder_id, 'missed_dose',
         'No check-in yet for ' || m.name || ' (' || to_char(m.time_ist, 'HH24:MI') || ')',
         'missed:' || m.id || ':' || today
  from medicines m
  where m.active
    and ((today + m.time_ist) at time zone 'Asia/Kolkata') + interval '30 minutes' <= now()
    and m.created_at <= ((today + m.time_ist) at time zone 'Asia/Kolkata')
    and not exists (select 1 from dose_checkins c where c.medicine_id = m.id and c.day = today)
  on conflict (dedupe_key) do nothing;
  get diagnostics made = row_count;
  return made;
end $$;

revoke execute on function public.check_missed_doses() from public, anon, authenticated;
revoke execute on function public.update_alert_location, public.resolve_alert from public, anon;
grant execute on function public.update_alert_location, public.resolve_alert to authenticated;

-- Live updates: people receive alerts the moment they are raised (Row Level Security still applies).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alerts') then
    alter publication supabase_realtime add table public.alerts;
  end if;
end $$;

-- Run the missed-medicine check every 10 minutes inside the database (Supabase Cron).
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('aegis-missed-doses', '*/10 * * * *', 'select public.check_missed_doses()');
  end if;
end $$;
