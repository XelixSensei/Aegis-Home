-- Aegis Home core schema. Run once in the Supabase SQL editor (Database > SQL editor > New query).
-- Every table uses Row Level Security: people see only their own data, data of elders who
-- invited them, or alerts sent to their verified elderly home.

create extension if not exists pgcrypto with schema extensions;

-- ---------- Types ----------
create type public.app_role as enum ('grandparent', 'caretaker', 'elderly_home');
create type public.link_permission as enum ('view', 'manage');
create type public.home_status as enum ('pending', 'approved', 'rejected');
create type public.alert_kind as enum ('missed_dose', 'emergency', 'abandoned');
create type public.alert_status as enum ('open', 'acknowledged', 'resolved');

-- ---------- Tables ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  full_name text not null check (char_length(full_name) between 1 and 80),
  phone text not null unique check (phone ~ '^\+91[6-9][0-9]{9}$'),
  lang text not null default 'en' check (lang in ('en', 'hi')),
  created_at timestamptz not null default now()
);

-- Xelix adds admins by hand: insert into public.admins values ('<profile id>');
create table public.admins (
  profile_id uuid primary key references public.profiles (id) on delete cascade
);

-- An elder creates an invite code; a caretaker who enters it joins the care circle.
create table public.care_links (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references public.profiles (id) on delete cascade,
  caretaker_id uuid references public.profiles (id) on delete cascade,
  permission public.link_permission not null default 'view',
  invite_code_hash text,
  expires_at timestamptz,
  attempts int not null default 0,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (elder_id, caretaker_id)
);

-- Elderly homes must be approved by an admin after checking their government registration.
create table public.elderly_homes (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  org_name text not null check (char_length(org_name) between 2 and 120),
  licence_number text not null check (char_length(licence_number) between 3 and 60),
  licence_doc_path text,
  status public.home_status not null default 'pending',
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  service_radius_km int not null default 25 check (service_radius_km between 1 and 200),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.medicines (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  dose text check (char_length(dose) <= 80),
  note text check (char_length(note) <= 160),
  time_ist time not null,
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.dose_checkins (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references public.profiles (id) on delete cascade,
  medicine_id uuid references public.medicines (id) on delete set null,
  day date not null,
  photo_path text not null,
  taken_at timestamptz not null default now(),
  unique (medicine_id, day)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references public.profiles (id) on delete cascade,
  kind public.alert_kind not null,
  message text check (char_length(message) <= 500),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  status public.alert_status not null default 'open',
  recipient_home_ids uuid[] not null default '{}',
  acknowledged_by uuid references public.profiles (id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_elder_idx on public.alerts (elder_id, created_at desc);

create table public.loved_ones (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  relation text check (char_length(relation) <= 40),
  photo_path text,
  video_path text,
  voice_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- Helper functions ----------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where profile_id = auth.uid());
$$;

create function public.is_caretaker_of(elder uuid, need_manage boolean default false) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from care_links
    where elder_id = elder and caretaker_id = auth.uid() and accepted_at is not null
      and (not need_manage or permission = 'manage')
  );
$$;

-- Storage folders are named after the elder's id; compare as text so bad names never error.
create function public.can_see_elder_folder(folder text, need_manage boolean default false) returns boolean
language sql stable security definer set search_path = public as $$
  select folder = auth.uid()::text or exists (
    select 1 from care_links
    where elder_id::text = folder and caretaker_id = auth.uid() and accepted_at is not null
      and (not need_manage or permission = 'manage')
  );
$$;

create function public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- ---------- Guards: fields people must not change themselves ----------
create function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the dashboard / service role, which may change anything.
  if auth.uid() is not null and (new.role is distinct from old.role or new.phone is distinct from old.phone) then
    raise exception 'role and phone cannot be changed';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile();

create function public.guard_home() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.review_note := null; new.reviewed_at := null;
    elsif new.status is distinct from old.status or new.review_note is distinct from old.review_note
       or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'only an admin can change verification';
    elsif new.licence_number is distinct from old.licence_number or new.licence_doc_path is distinct from old.licence_doc_path then
      new.status := 'pending'; -- new documents need a fresh review
    end if;
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then new.reviewed_at := now(); end if;
  return new;
end $$;
create trigger homes_guard before insert or update on public.elderly_homes for each row execute function public.guard_home();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.care_links enable row level security;
alter table public.elderly_homes enable row level security;
alter table public.medicines enable row level security;
alter table public.dose_checkins enable row level security;
alter table public.alerts enable row level security;
alter table public.loved_ones enable row level security;

-- Profiles: yourself, your care circle, elders whose alert reached your home, and admins.
create policy profiles_read on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_admin() or public.is_caretaker_of(id)
  or exists (select 1 from care_links l where l.elder_id = auth.uid() and l.caretaker_id = profiles.id and l.accepted_at is not null)
  or exists (select 1 from alerts a where a.elder_id = profiles.id and auth.uid() = any (a.recipient_home_ids))
  or exists (select 1 from elderly_homes h where h.profile_id = profiles.id and h.status = 'approved')
);
-- The phone must match the number the person signed up with (their login address).
create policy profiles_insert on public.profiles for insert to authenticated with check (
  id = auth.uid() and '+' || split_part(auth.jwt() ->> 'email', '@', 1) = phone
);
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy admins_read on public.admins for select to authenticated using (profile_id = auth.uid());

-- Care links: both sides can see and remove them. Created and accepted only through functions below.
create policy links_read on public.care_links for select to authenticated using (
  elder_id = auth.uid() or caretaker_id = auth.uid() or public.is_admin()
);
create policy links_delete on public.care_links for delete to authenticated using (
  elder_id = auth.uid() or caretaker_id = auth.uid()
);

create policy homes_read on public.elderly_homes for select to authenticated using (
  profile_id = auth.uid() or status = 'approved' or public.is_admin()
);
create policy homes_insert on public.elderly_homes for insert to authenticated with check (
  profile_id = auth.uid() and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'elderly_home')
);
create policy homes_update on public.elderly_homes for update to authenticated
  using (profile_id = auth.uid() or public.is_admin()) with check (profile_id = auth.uid() or public.is_admin());

create policy medicines_read on public.medicines for select to authenticated using (elder_id = auth.uid() or public.is_caretaker_of(elder_id));
create policy medicines_write on public.medicines for all to authenticated
  using (elder_id = auth.uid() or public.is_caretaker_of(elder_id, true))
  with check (elder_id = auth.uid() or public.is_caretaker_of(elder_id, true));

-- Only the elder records their own check-in; the care circle can look.
create policy checkins_read on public.dose_checkins for select to authenticated using (elder_id = auth.uid() or public.is_caretaker_of(elder_id));
create policy checkins_insert on public.dose_checkins for insert to authenticated with check (elder_id = auth.uid());
create policy checkins_delete on public.dose_checkins for delete to authenticated using (elder_id = auth.uid());

-- Alerts are created and acknowledged only through functions below.
create policy alerts_read on public.alerts for select to authenticated using (
  elder_id = auth.uid() or public.is_caretaker_of(elder_id) or auth.uid() = any (recipient_home_ids) or public.is_admin()
);

create policy loved_read on public.loved_ones for select to authenticated using (elder_id = auth.uid() or public.is_caretaker_of(elder_id));
create policy loved_write on public.loved_ones for all to authenticated
  using (elder_id = auth.uid() or public.is_caretaker_of(elder_id, true))
  with check (elder_id = auth.uid() or public.is_caretaker_of(elder_id, true));

-- ---------- Care circle functions ----------
-- Returns a 6-digit code to share. It expires in 24 hours and allows 5 attempts.
create function public.create_invite(perm public.link_permission default 'view') returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  code text := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::int::bigint + 2147483648) % 1000000)::text, 6, '0');
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'grandparent') then
    raise exception 'only a grandparent account can invite';
  end if;
  delete from care_links where elder_id = auth.uid() and accepted_at is null;
  insert into care_links (elder_id, permission, invite_code_hash, expires_at)
  values (auth.uid(), perm, crypt(code, gen_salt('bf')), now() + interval '24 hours');
  return code;
end $$;

-- A caretaker enters the elder's number and code. Returns true when they have joined.
create function public.accept_invite(elder_phone text, code text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  link care_links;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'caretaker') then
    raise exception 'only a caretaker account can join a care circle';
  end if;
  select l.* into link from care_links l join profiles p on p.id = l.elder_id
  where p.phone = elder_phone and l.accepted_at is null and l.expires_at > now()
  order by l.created_at desc limit 1 for update of l;
  if not found or link.attempts >= 5 then return false; end if;
  if link.invite_code_hash = crypt(code, link.invite_code_hash) then
    if exists (select 1 from care_links where elder_id = link.elder_id and caretaker_id = auth.uid()) then
      delete from care_links where id = link.id;
      return true;
    end if;
    update care_links set caretaker_id = auth.uid(), accepted_at = now(), invite_code_hash = null, expires_at = null where id = link.id;
    return true;
  end if;
  update care_links set attempts = attempts + 1 where id = link.id;
  return false;
end $$;

create function public.set_link_permission(link uuid, perm public.link_permission) returns void
language sql security definer set search_path = public as $$
  update care_links set permission = perm where id = link and elder_id = auth.uid();
$$;

-- ---------- Alerts ----------
-- Approved homes whose service area covers a point, nearest first.
create function public.nearest_homes(p_lat double precision, p_lng double precision, max_results int default 5)
returns table (profile_id uuid, org_name text, phone text, distance_km double precision)
language sql stable security definer set search_path = public as $$
  select h.profile_id, h.org_name, p.phone, public.distance_km(p_lat, p_lng, h.lat, h.lng) as d
  from elderly_homes h join profiles p on p.id = h.profile_id
  where h.status = 'approved' and h.lat is not null and h.lng is not null
    and public.distance_km(p_lat, p_lng, h.lat, h.lng) <= h.service_radius_km
  order by d limit least(greatest(max_results, 1), 10);
$$;

-- An elder raises an emergency or abandonment alert. Abandonment goes to nearby approved homes.
create function public.raise_alert(alert_kind public.alert_kind, alert_lat double precision default null,
  alert_lng double precision default null, alert_message text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  homes uuid[] := '{}';
  new_id uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'grandparent') then
    raise exception 'only a grandparent account can raise an alert';
  end if;
  if alert_kind = 'missed_dose' then raise exception 'missed-dose alerts come from the server'; end if;
  if (select count(*) from alerts where elder_id = auth.uid() and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too many alerts, please call 112';
  end if;
  if alert_kind = 'abandoned' and alert_lat is not null and alert_lng is not null then
    select coalesce(array_agg(n.profile_id), '{}') into homes from public.nearest_homes(alert_lat, alert_lng, 5) n;
  end if;
  insert into alerts (elder_id, kind, lat, lng, message, recipient_home_ids)
  values (auth.uid(), alert_kind, alert_lat, alert_lng, left(alert_message, 500), homes)
  returning id into new_id;
  return new_id;
end $$;

create function public.acknowledge_alert(alert uuid) returns void
language sql security definer set search_path = public as $$
  update alerts set status = 'acknowledged', acknowledged_by = auth.uid(), acknowledged_at = now()
  where id = alert and status = 'open'
    and (public.is_caretaker_of(elder_id) or auth.uid() = any (recipient_home_ids));
$$;

-- Functions are for signed-in people only.
revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_invite, public.accept_invite, public.set_link_permission,
  public.nearest_homes, public.raise_alert, public.acknowledge_alert,
  public.is_admin, public.is_caretaker_of, public.can_see_elder_folder, public.distance_km to authenticated;

-- ---------- Private file storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('checkins', 'checkins', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('licences', 'licences', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('loved-ones', 'loved-ones', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/mp4']);

-- Files live under <elder id>/... so the folder name decides who may see them.
create policy checkins_files_read on storage.objects for select to authenticated
  using (bucket_id = 'checkins' and public.can_see_elder_folder((storage.foldername(name))[1]));
create policy checkins_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text);
create policy checkins_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text);

create policy licences_files_read on storage.objects for select to authenticated
  using (bucket_id = 'licences' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy licences_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'licences' and (storage.foldername(name))[1] = auth.uid()::text);

create policy loved_files_read on storage.objects for select to authenticated
  using (bucket_id = 'loved-ones' and public.can_see_elder_folder((storage.foldername(name))[1]));
create policy loved_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'loved-ones' and public.can_see_elder_folder((storage.foldername(name))[1], true));
create policy loved_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'loved-ones' and public.can_see_elder_folder((storage.foldername(name))[1], true));
