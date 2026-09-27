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
  created_at timestamptz default now()
);

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
  ('economy', 'اقتصادي', 4, 12, 4.5, 0.35),
  ('comfort', 'Comfort', 4, 18, 6.5, 0.5),
  ('masseya', 'Masseya', 4, 15, 5.5, 0.4),
  ('tuktuk', 'توك توك', 3, 8, 3.2, 0.25),
  ('scooter', 'سكوتر', 1, 7, 3.0, 0.2)
on conflict (id) do update set
  label = excluded.label,
  seats = excluded.seats,
  base_fare = excluded.base_fare,
  per_km = excluded.per_km,
  per_min = excluded.per_min;

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
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
  started_at timestamptz,
  completed_at timestamptz
);

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
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  insert into public.payment_methods (user_id, type, label, is_default)
  values (new.id, 'cash', 'نقدًا', true)
  on conflict do nothing;

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

create or replace function public.assign_driver_to_ride()
returns trigger as $$
declare
  did uuid;
begin
  if new.status = 'requested' and new.driver_id is null and new.pickup_lat is not null then
    did := public.nearest_online_driver(new.pickup_lat, new.pickup_lng, new.ride_type);
    if did is not null then
      new.driver_id := did;
      new.status := 'accepted';
      new.accepted_at := now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_assign_driver on public.rides;
create trigger trg_assign_driver
  before insert on public.rides
  for each row execute procedure public.assign_driver_to_ride();

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

drop policy if exists "manage own rides" on public.rides;
create policy "manage own rides" on public.rides
  for all using (auth.uid() = rider_id) with check (auth.uid() = rider_id);

drop policy if exists "manage own ride stops" on public.ride_stops;
create policy "manage own ride stops" on public.ride_stops
  for all using (
    exists (
      select 1 from public.rides r
      where r.id = ride_stops.ride_id and r.rider_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.rides r
      where r.id = ride_stops.ride_id and r.rider_id = auth.uid()
    )
  );

alter table public.drivers enable row level security;
drop policy if exists "read online drivers" on public.drivers;
create policy "read online drivers" on public.drivers
  for select using (true);

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
