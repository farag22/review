-- ============================================================
-- Sahil Drive — قاعدة بيانات الراكب (Supabase / Postgres)
-- شغّل هذا الملف في SQL Editor في مشروع Supabase الخاص بك
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text unique,
  avatar_url text,
  role text default 'rider',
  created_at timestamptz default now()
);

alter table public.profiles add column if not exists role text default 'rider';

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  label text not null,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(10,2) not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.wallet_txns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  kind text not null,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  label text,
  last4 text,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.ride_types (
  id text primary key,
  label text not null,
  seats int not null default 4,
  base_fare numeric(10,2) not null default 10,
  per_km numeric(10,2) not null default 5,
  per_min numeric(10,2) not null default 0.4
);

insert into public.ride_types (id, label, seats, base_fare, per_km, per_min) values
  ('economy', 'Saver', 4, 16, 5.25, 0.32),
  ('comfort', 'Comfort', 4, 24, 7.6, 0.5),
  ('masseya', 'Masseya', 4, 19, 6.15, 0.4),
  ('tuktuk', 'توك توك', 3, 10, 3.45, 0.18),
  ('scooter', 'سكوتر', 1, 8, 2.85, 0.12)
on conflict (id) do update set
  label = excluded.label,
  seats = excluded.seats,
  base_fare = excluded.base_fare,
  per_km = excluded.per_km,
  per_min = excluded.per_min;

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text,
  phone text,
  car_model text,
  plate_number text,
  rating numeric(2,1) default 5.0,
  is_online boolean default false,
  ride_type text references public.ride_types(id),
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

alter table public.drivers add column if not exists user_id uuid unique references auth.users(id) on delete set null;

create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references public.profiles(id) on delete cascade,
  driver_id uuid references public.drivers(id),
  pickup_address text,
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_address text,
  dropoff_lat double precision,
  dropoff_lng double precision,
  ride_type text,
  fare numeric(10,2),
  distance_km numeric(10,2),
  duration_min int,
  payment_method text default 'cash',
  status text default 'requested',
  scheduled_at timestamptz,
  rider_rating int,
  driver_rating int,
  requested_at timestamptz default now(),
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
);

alter table public.rides add column if not exists arrived_at timestamptz;

create table if not exists public.ride_stops (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid references public.rides(id) on delete cascade,
  label text,
  lat double precision,
  lng double precision,
  wait_minutes int default 10,
  stop_order int default 1
);

create table if not exists public.promo_codes (
  code text primary key,
  discount_percent int,
  active boolean default true,
  expires_at timestamptz
);

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'rider');
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    v_role
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name),
        phone = coalesce(excluded.phone, public.profiles.phone),
        role = coalesce(excluded.role, public.profiles.role);

  insert into public.wallets (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  insert into public.payment_methods (user_id, type, label, is_default)
  values (new.id, 'cash', 'نقدًا', true)
  on conflict do nothing;

  if v_role = 'captain' then
    insert into public.drivers (user_id, full_name, phone, car_model, plate_number, ride_type)
    values (
      new.id,
      new.raw_user_meta_data ->> 'full_name',
      nullif(new.raw_user_meta_data ->> 'phone', ''),
      new.raw_user_meta_data ->> 'car_model',
      new.raw_user_meta_data ->> 'plate_number',
      nullif(new.raw_user_meta_data ->> 'ride_type', '')
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.nearest_online_driver(p_lat double precision, p_lng double precision, p_ride_type text)
returns uuid as $$
  select d.id
  from public.drivers d
  where d.is_online is true
    and d.lat is not null
    and d.lng is not null
    and (p_ride_type is null or d.ride_type = p_ride_type or d.ride_type is null)
  order by ((d.lat - p_lat)^2 + (d.lng - p_lng)^2)
  limit 1;
$$ language sql stable;

-- الرحلات تبقى requested حتى يقبلها كابتن من لوحة التحكم
drop trigger if exists trg_assign_driver on public.rides;

alter table public.profiles enable row level security;
alter table public.saved_places enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_txns enable row level security;
alter table public.payment_methods enable row level security;
alter table public.rides enable row level security;
alter table public.ride_stops enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "manage own saved places" on public.saved_places;
create policy "manage own saved places" on public.saved_places
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "read own wallet" on public.wallets;
create policy "read own wallet" on public.wallets
  for select using (auth.uid() = user_id);
drop policy if exists "update own wallet" on public.wallets;
create policy "update own wallet" on public.wallets
  for update using (auth.uid() = user_id);
drop policy if exists "insert own wallet" on public.wallets;
create policy "insert own wallet" on public.wallets
  for insert with check (auth.uid() = user_id);

drop policy if exists "manage own wallet txns" on public.wallet_txns;
create policy "manage own wallet txns" on public.wallet_txns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "manage own payment methods" on public.payment_methods;
create policy "manage own payment methods" on public.payment_methods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id from public.drivers d where d.user_id = auth.uid() limit 1;
$$;

create or replace function public.is_online_captain_for(p_ride_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.drivers d
    where d.user_id = auth.uid()
      and d.is_online is true
      and (d.ride_type is null or p_ride_type is null or d.ride_type = p_ride_type)
  );
$$;

create or replace function public.captain_assigned_to_ride(p_ride_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rides r
    where r.id = p_ride_id and r.driver_id = public.current_driver_id()
  );
$$;

create or replace function public.is_ride_owner(p_ride_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rides r
    where r.id = p_ride_id and r.rider_id = auth.uid()
  );
$$;

drop policy if exists "manage own rides" on public.rides;
drop policy if exists "riders manage own rides" on public.rides;
create policy "riders manage own rides" on public.rides
  for all using (auth.uid() = rider_id) with check (auth.uid() = rider_id);

drop policy if exists "manage own ride stops" on public.ride_stops;
create policy "manage own ride stops" on public.ride_stops
  for all
  using (
    public.is_ride_owner(ride_id)
    or public.captain_assigned_to_ride(ride_id)
  )
  with check (
    public.is_ride_owner(ride_id)
    or public.captain_assigned_to_ride(ride_id)
  );

alter table public.drivers enable row level security;
drop policy if exists "read online drivers" on public.drivers;
create policy "read online drivers" on public.drivers
  for select using (true);
drop policy if exists "captains insert self" on public.drivers;
create policy "captains insert self" on public.drivers
  for insert with check (auth.uid() = user_id);
drop policy if exists "captains update self" on public.drivers;
create policy "captains update self" on public.drivers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "captains delete self" on public.drivers;
create policy "captains delete self" on public.drivers
  for delete using (auth.uid() = user_id);

drop policy if exists "captains read matching rides" on public.rides;
drop policy if exists "captains read assigned rides" on public.rides;
create policy "captains read assigned rides" on public.rides
  for select using (driver_id is not null and driver_id = public.current_driver_id());

drop policy if exists "captains read requested rides" on public.rides;
create policy "captains read requested rides" on public.rides
  for select using (
    status = 'requested'
    and driver_id is null
    and public.is_online_captain_for(ride_type)
  );

drop policy if exists "captains accept and update rides" on public.rides;
drop policy if exists "captains update assigned rides" on public.rides;
create policy "captains update assigned rides" on public.rides
  for update
  using (driver_id = public.current_driver_id())
  with check (driver_id = public.current_driver_id());

drop policy if exists "captains accept requested rides" on public.rides;
create policy "captains accept requested rides" on public.rides
  for update
  using (
    status = 'requested'
    and driver_id is null
    and public.is_online_captain_for(ride_type)
  )
  with check (driver_id = public.current_driver_id());

drop policy if exists "captains read ride stops" on public.ride_stops;

drop policy if exists "captains read assigned rider profiles" on public.profiles;
create policy "captains read assigned rider profiles" on public.profiles
  for select using (id = auth.uid() or public.current_driver_id() is not null);

create index if not exists rides_requested_type_idx
  on public.rides (ride_type, requested_at desc)
  where status = 'requested' and driver_id is null;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles" on public.profiles
  for select using (public.is_admin());

drop policy if exists "admins update all profiles" on public.profiles;
create policy "admins update all profiles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage drivers" on public.drivers;
create policy "admins manage drivers" on public.drivers
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage rides" on public.rides;
create policy "admins manage rides" on public.rides
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read ride stops" on public.ride_stops;
create policy "admins read ride stops" on public.ride_stops
  for select using (public.is_admin());

drop policy if exists "admins read wallets" on public.wallets;
create policy "admins read wallets" on public.wallets
  for select using (public.is_admin());

alter table public.ride_types enable row level security;
drop policy if exists "read ride types" on public.ride_types;
create policy "read ride types" on public.ride_types
  for select using (true);

insert into public.drivers (full_name, phone, car_model, plate_number, rating, is_online, ride_type, lat, lng)
select * from (values
  ('محمود حسن', '01011111111', 'هيونداي إلنترا', 'ق ل ب 1204', 4.8::numeric, true, 'economy', 30.470, 31.184),
  ('أحمد فتحي', '01022222222', 'شيفروليه أوبترا', 'ق ل ب 3381', 4.7::numeric, true, 'comfort', 30.461, 31.191),
  ('عمر علي', '01033333333', 'هوندا سيفيك', 'ق ل ب 5300', 4.9::numeric, true, 'masseya', 30.468, 31.178),
  ('سامي نبيل', '01044444444', 'توك توك', 'ق ل ب 9012', 4.6::numeric, true, 'tuktuk', 30.472, 31.189),
  ('كريم يوسف', '01055555555', 'سكوتر هوندا', 'ق ل ب 4410', 4.5::numeric, true, 'scooter', 30.459, 31.180)
) as v(full_name, phone, car_model, plate_number, rating, is_online, ride_type, lat, lng)
where not exists (select 1 from public.drivers);
