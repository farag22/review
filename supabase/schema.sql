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

create table if not exists public.wallet_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  phone_number text,
  receipt_image_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
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
  completed_at timestamptz,
  settled_at timestamptz,
  app_commission numeric(10,2),
  captain_net numeric(10,2)
);

alter table public.rides add column if not exists arrived_at timestamptz;
alter table public.rides add column if not exists settled_at timestamptz;
alter table public.rides add column if not exists app_commission numeric(10,2);
alter table public.rides add column if not exists captain_net numeric(10,2);

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
alter table public.wallet_requests enable row level security;
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
drop policy if exists "insert own wallet" on public.wallets;
create policy "insert own wallet" on public.wallets
  for insert with check (auth.uid() = user_id and balance = 0);

drop policy if exists "manage own wallet txns" on public.wallet_txns;
create policy "manage own wallet txns" on public.wallet_txns
  for select using (auth.uid() = user_id);
drop policy if exists "insert own wallet txns" on public.wallet_txns;
create policy "insert own wallet txns" on public.wallet_txns
  for insert with check (auth.uid() = user_id and kind <> 'topup');

drop policy if exists "riders insert own wallet requests" on public.wallet_requests;
create policy "riders insert own wallet requests" on public.wallet_requests
  for insert with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "riders read own wallet requests" on public.wallet_requests;
create policy "riders read own wallet requests" on public.wallet_requests
  for select using (auth.uid() = user_id);

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
drop policy if exists "admins update wallets" on public.wallets;
create policy "admins update wallets" on public.wallets
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins insert wallets" on public.wallets;
create policy "admins insert wallets" on public.wallets
  for insert with check (public.is_admin());
drop policy if exists "admins insert wallet txns" on public.wallet_txns;
create policy "admins insert wallet txns" on public.wallet_txns
  for insert with check (public.is_admin());
drop policy if exists "admins manage wallet requests" on public.wallet_requests;
create policy "admins manage wallet requests" on public.wallet_requests
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.review_wallet_request(p_request_id uuid, p_approve boolean, p_note text default null)
returns public.wallet_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.wallet_requests;
begin
  if not public.is_admin() then
    raise exception 'غير مصرح: حساب الإدارة فقط';
  end if;

  select * into req
  from public.wallet_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'طلب الشحن غير موجود';
  end if;

  if req.status <> 'pending' then
    raise exception 'تمت مراجعة هذا الطلب مسبقاً';
  end if;

  if p_approve then
    insert into public.wallets (user_id, balance, updated_at)
    values (req.user_id, req.amount, now())
    on conflict (user_id) do update
      set balance = public.wallets.balance + excluded.balance,
          updated_at = now();

    insert into public.wallet_txns (user_id, amount, kind, note)
    values (req.user_id, req.amount, 'topup', coalesce(p_note, 'شحن بعد موافقة الإدارة'));

    update public.wallet_requests
    set status = 'approved',
        admin_note = p_note,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = p_request_id
    returning * into req;
  else
    update public.wallet_requests
    set status = 'rejected',
        admin_note = p_note,
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = p_request_id
    returning * into req;
  end if;

  return req;
end;
$$;

grant execute on function public.review_wallet_request(uuid, boolean, text) to authenticated;

create or replace function public.held_wallet_fare(p_rider_id uuid, p_except_ride uuid default null)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(r.fare), 0)
  from public.rides r
  where r.rider_id = p_rider_id
    and r.payment_method = 'wallet'
    and r.status in ('requested', 'scheduled', 'accepted', 'arrived', 'in_progress')
    and (p_except_ride is null or r.id <> p_except_ride);
$$;

create or replace function public.assert_wallet_can_pay(p_rider_id uuid, p_fare numeric, p_except_ride uuid default null)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_balance numeric := 0;
  v_held numeric := 0;
begin
  if p_fare is null or p_fare <= 0 then
    raise exception 'قيمة الرحلة غير صحيحة';
  end if;

  select coalesce(w.balance, 0) into v_balance
  from public.wallets w
  where w.user_id = p_rider_id;

  v_held := public.held_wallet_fare(p_rider_id, p_except_ride);

  if v_balance < p_fare + v_held then
    raise exception 'رصيد المحفظة غير كافٍ، يرجى الشحن أو الدفع نقداً';
  end if;
end;
$$;

create or replace function public.trg_assert_wallet_on_ride()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_method = 'wallet'
     and new.status in ('requested', 'scheduled', 'accepted', 'arrived', 'in_progress') then
    perform public.assert_wallet_can_pay(new.rider_id, new.fare, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assert_wallet_on_ride on public.rides;
create trigger trg_assert_wallet_on_ride
  before insert or update of payment_method, fare, status
  on public.rides
  for each row
  execute procedure public.trg_assert_wallet_on_ride();

create or replace function public.ensure_wallet(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.wallets (user_id, balance, updated_at)
  values (p_user_id, 0, now())
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.settle_completed_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  ride public.rides;
  v_fare numeric;
  v_commission numeric;
  v_net numeric;
  v_captain_user uuid;
  v_updated int;
begin
  select * into ride
  from public.rides
  where id = p_ride_id
  for update;

  if not found then
    raise exception 'الرحلة غير موجودة';
  end if;

  if ride.status <> 'completed' then
    raise exception 'لا يمكن تسوية رحلة غير مكتملة';
  end if;

  if ride.settled_at is not null then
    return ride;
  end if;

  v_fare := coalesce(ride.fare, 0);
  if v_fare <= 0 then
    raise exception 'قيمة الرحلة غير صحيحة';
  end if;

  v_commission := round(v_fare * 0.10, 2);
  v_net := round(v_fare - v_commission, 2);

  select d.user_id into v_captain_user
  from public.drivers d
  where d.id = ride.driver_id;

  perform public.ensure_wallet(ride.rider_id);
  perform public.ensure_wallet(v_captain_user);

  if ride.payment_method = 'wallet' then
    update public.wallets
    set balance = balance - v_fare,
        updated_at = now()
    where user_id = ride.rider_id
      and balance >= v_fare;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'رصيد المحفظة غير كافٍ، يرجى الشحن أو الدفع نقداً';
    end if;

    insert into public.wallet_txns (user_id, amount, kind, note)
    values (ride.rider_id, v_fare, 'ride_debit', 'خصم أجرة رحلة بالمحفظة');

    if v_captain_user is not null then
      update public.wallets
      set balance = balance + v_net,
          updated_at = now()
      where user_id = v_captain_user;

      insert into public.wallet_txns (user_id, amount, kind, note)
      values (v_captain_user, v_net, 'ride_credit', 'صافي أجرة رحلة بعد عمولة التطبيق 10%');
    end if;
  else
    if v_captain_user is not null then
      update public.wallets
      set balance = balance - v_commission,
          updated_at = now()
      where user_id = v_captain_user;

      insert into public.wallet_txns (user_id, amount, kind, note)
      values (v_captain_user, v_commission, 'commission', 'عمولة التطبيق 10% على رحلة نقدية');
    end if;
  end if;

  update public.rides
  set settled_at = now(),
      app_commission = v_commission,
      captain_net = v_net
  where id = p_ride_id
  returning * into ride;

  return ride;
end;
$$;

create or replace function public.trg_settle_completed_ride()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    perform public.settle_completed_ride(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_settle_completed_ride on public.rides;
create trigger trg_settle_completed_ride
  after update of status
  on public.rides
  for each row
  execute procedure public.trg_settle_completed_ride();

grant execute on function public.held_wallet_fare(uuid, uuid) to authenticated;
grant execute on function public.assert_wallet_can_pay(uuid, numeric, uuid) to authenticated;
grant execute on function public.settle_completed_ride(uuid) to authenticated;

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
