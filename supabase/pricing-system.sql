-- Sahil Drive — Professional server-side pricing system
-- All final amounts are calculated in Supabase. The client never supplies fare.

begin;

create table if not exists public.pricing_settings (
  id text primary key default 'default',
  currency text not null default 'EGP',
  passenger_base numeric(10,2) not null default 8,
  passenger_per_km numeric(10,2) not null default 4,
  passenger_per_min numeric(10,2) not null default 0.75,
  passenger_min_fare numeric(10,2) not null default 20,
  captain_base numeric(10,2) not null default 6,
  captain_per_km numeric(10,2) not null default 3,
  captain_per_min numeric(10,2) not null default 0.50,
  commission_mode text not null default 'percent' check (commission_mode in ('percent','fixed','none')),
  commission_value numeric(10,2) not null default 15,
  booking_fee_enabled boolean not null default false,
  booking_fee numeric(10,2) not null default 0,
  waiting_fee_enabled boolean not null default false,
  waiting_fee_per_min numeric(10,2) not null default 0,
  cancellation_fee_enabled boolean not null default false,
  cancellation_fee numeric(10,2) not null default 0,
  toll_fee_enabled boolean not null default false,
  toll_fee numeric(10,2) not null default 0,
  surge_enabled boolean not null default true,
  default_surge_multiplier numeric(5,2) not null default 1.0,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  check (passenger_base >= 0 and passenger_per_km >= 0 and passenger_per_min >= 0 and passenger_min_fare >= 0),
  check (captain_base >= 0 and captain_per_km >= 0 and captain_per_min >= 0),
  check (commission_value >= 0),
  check (default_surge_multiplier >= 1 and default_surge_multiplier <= 5)
);

insert into public.pricing_settings (id) values ('default') on conflict (id) do nothing;

create table if not exists public.pricing_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  priority integer not null default 0,
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision,
  passenger_base numeric(10,2),
  passenger_per_km numeric(10,2),
  passenger_per_min numeric(10,2),
  passenger_min_fare numeric(10,2),
  captain_base numeric(10,2),
  captain_per_km numeric(10,2),
  captain_per_min numeric(10,2),
  commission_mode text check (commission_mode is null or commission_mode in ('percent','fixed','none')),
  commission_value numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.surge_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  multiplier numeric(5,2) not null default 1.0 check (multiplier >= 1 and multiplier <= 5),
  days smallint[] not null default '{}',
  starts_at time,
  ends_at time,
  created_at timestamptz not null default now()
);

create table if not exists public.pricing_vehicle_rules (
  id uuid primary key default gen_random_uuid(),
  ride_type text not null,
  zone_id uuid references public.pricing_zones(id) on delete cascade,
  commission_mode text not null default 'percent' check (commission_mode in ('percent','fixed','none')),
  commission_value numeric(10,2) not null default 15,
  active boolean not null default true,
  unique (ride_type, zone_id)
);

create table if not exists public.pricing_versions (
  id uuid primary key default gen_random_uuid(),
  version_no bigint generated always as identity unique,
  source text not null default 'admin',
  config jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ride_fares (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null unique references public.rides(id) on delete cascade,
  pickup_location jsonb,
  destination_location jsonb,
  distance_km numeric(10,2) not null default 0,
  duration_minutes integer not null default 0,
  base_fare numeric(10,2) not null default 0,
  distance_fare numeric(10,2) not null default 0,
  time_fare numeric(10,2) not null default 0,
  surge_multiplier numeric(5,2) not null default 1,
  extra_fees numeric(10,2) not null default 0,
  passenger_total numeric(10,2) not null default 0,
  captain_gross numeric(10,2) not null default 0,
  platform_commission numeric(10,2) not null default 0,
  captain_net numeric(10,2) not null default 0,
  pricing_version bigint,
  created_at timestamptz not null default now()
);

alter table public.rides add column if not exists pickup_location jsonb;
alter table public.rides add column if not exists destination_location jsonb;
alter table public.rides add column if not exists base_fare numeric(10,2);
alter table public.rides add column if not exists distance_fare numeric(10,2);
alter table public.rides add column if not exists time_fare numeric(10,2);
alter table public.rides add column if not exists surge_multiplier numeric(5,2) default 1;
alter table public.rides add column if not exists extra_fees numeric(10,2) default 0;
alter table public.rides add column if not exists passenger_total numeric(10,2);
alter table public.rides add column if not exists captain_gross numeric(10,2);
alter table public.rides add column if not exists platform_commission numeric(10,2);
alter table public.rides add column if not exists pricing_version bigint;
alter table public.rides add column if not exists cancellation_fee numeric(10,2) default 0;

create or replace function public.pricing_config_json()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select to_jsonb(s) from public.pricing_settings s where s.id = 'default';
$$;

create or replace function public.snapshot_pricing_version()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.pricing_versions(source, config, created_by)
  values ('admin', to_jsonb(new), new.updated_by);
  return new;
end;
$$;

drop trigger if exists trg_snapshot_pricing_version on public.pricing_settings;
create trigger trg_snapshot_pricing_version
after insert or update on public.pricing_settings
for each row execute function public.snapshot_pricing_version();

-- Seed an initial immutable version when the table was newly created.
insert into public.pricing_versions(source, config)
select 'seed', public.pricing_config_json()
where not exists (select 1 from public.pricing_versions);

create or replace function public.active_surge_multiplier(p_at timestamptz default now())
returns numeric language sql stable security definer set search_path = public
as $$
  select greatest(1::numeric, coalesce(max(sr.multiplier), (select default_surge_multiplier from public.pricing_settings where id='default'), 1))
  from public.surge_rules sr
  where sr.active
    and (cardinality(sr.days) = 0 or extract(dow from p_at)::smallint = any(sr.days))
    and (
      sr.starts_at is null or sr.ends_at is null
      or case when sr.starts_at <= sr.ends_at then p_at::time between sr.starts_at and sr.ends_at
              else (p_at::time >= sr.starts_at or p_at::time <= sr.ends_at) end
    );
$$;

create or replace function public.pricing_quote(
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_distance_km numeric,
  p_duration_minutes integer,
  p_ride_type text default 'economy',
  p_waiting_minutes integer default 0,
  p_at timestamptz default now()
)
returns table (
  zone_name text,
  base_fare numeric,
  distance_fare numeric,
  time_fare numeric,
  surge_multiplier numeric,
  extra_fees numeric,
  passenger_total numeric,
  captain_gross numeric,
  platform_commission numeric,
  captain_net numeric,
  pricing_version bigint
)
language plpgsql stable security definer set search_path = public
as $$
declare
  s public.pricing_settings;
  z public.pricing_zones;
  v_distance numeric := greatest(0, coalesce(p_distance_km, 0));
  v_duration numeric := greatest(0, coalesce(p_duration_minutes, 0));
  v_wait numeric := greatest(0, coalesce(p_waiting_minutes, 0));
  v_surge numeric;
  v_base numeric;
  v_distance_fare numeric;
  v_time_fare numeric;
  v_extra numeric := 0;
  v_passenger numeric;
  v_captain_gross numeric;
  v_commission numeric;
  v_version bigint;
  vr public.pricing_vehicle_rules;
begin
  select * into s from public.pricing_settings where id='default';
  select * into z from public.pricing_zones
  where active
    and min_lat is not null and min_lng is not null and max_lat is not null and max_lng is not null
    and p_pickup_lat between least(min_lat,max_lat) and greatest(min_lat,max_lat)
    and p_pickup_lng between least(min_lng,max_lng) and greatest(min_lng,max_lng)
  order by priority desc, updated_at desc limit 1;
  select * into vr from public.pricing_vehicle_rules
  where active and ride_type = p_ride_type and (zone_id = z.id or zone_id is null)
  order by (zone_id is not null) desc limit 1;

  v_surge := case when coalesce(s.surge_enabled, true) then public.active_surge_multiplier(p_at) else 1 end;
  v_base := coalesce(z.passenger_base, s.passenger_base, 8);
  v_distance_fare := v_distance * coalesce(z.passenger_per_km, s.passenger_per_km, 4);
  v_time_fare := v_duration * coalesce(z.passenger_per_min, s.passenger_per_min, 0.75);
  if coalesce(s.booking_fee_enabled, false) then v_extra := v_extra + coalesce(s.booking_fee, 0); end if;
  if coalesce(s.waiting_fee_enabled, false) then v_extra := v_extra + v_wait * coalesce(s.waiting_fee_per_min, 0); end if;
  if coalesce(s.toll_fee_enabled, false) then v_extra := v_extra + coalesce(s.toll_fee, 0); end if;

  v_passenger := greatest(coalesce(z.passenger_min_fare, s.passenger_min_fare, 20), ((v_base + v_distance_fare + v_time_fare) * v_surge) + v_extra);
  v_captain_gross := (coalesce(z.captain_base, s.captain_base, 6) + v_distance * coalesce(z.captain_per_km, s.captain_per_km, 3) + v_duration * coalesce(z.captain_per_min, s.captain_per_min, 0.50)) * v_surge;

  if coalesce(vr.commission_mode, z.commission_mode, s.commission_mode, 'percent') = 'none' then
    v_commission := 0;
  elsif coalesce(vr.commission_mode, z.commission_mode, s.commission_mode, 'percent') = 'fixed' then
    v_commission := coalesce(vr.commission_value, z.commission_value, s.commission_value, 0);
  else
    v_commission := v_passenger * coalesce(vr.commission_value, z.commission_value, s.commission_value, 15) / 100;
  end if;

  select version_no into v_version from public.pricing_versions order by version_no desc limit 1;
  return query select coalesce(z.name, 'الافتراضية'), round(v_base,2), round(v_distance_fare,2), round(v_time_fare,2), round(v_surge,2), round(v_extra,2), round(v_passenger,2), round(v_captain_gross,2), round(v_commission,2), round(greatest(0, v_captain_gross - v_commission),2), v_version;
end;
$$;

create or replace function public.create_ride_priced(
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_pickup_address text,
  p_dropoff_address text,
  p_ride_type text,
  p_distance_km numeric,
  p_duration_minutes integer,
  p_payment_method text default 'cash',
  p_scheduled_at timestamptz default null
)
returns public.rides
language plpgsql security definer set search_path = public
as $$
declare
  q record;
  r public.rides;
  v_id uuid := auth.uid();
  v_status text := case when p_scheduled_at is null then 'requested' else 'scheduled' end;
begin
  if v_id is null then raise exception 'يجب تسجيل الدخول لطلب الرحلة'; end if;
  select * into q from public.pricing_quote(p_pickup_lat,p_pickup_lng,p_dropoff_lat,p_dropoff_lng,p_distance_km,p_duration_minutes,p_ride_type,0,coalesce(p_scheduled_at,now()));
  if p_payment_method = 'wallet' then perform public.assert_wallet_can_pay(v_id, q.passenger_total, null); end if;

  insert into public.rides (
    rider_id,pickup_address,pickup_lat,pickup_lng,dropoff_address,dropoff_lat,dropoff_lng,ride_type,
    fare,distance_km,duration_min,payment_method,status,scheduled_at,
    pickup_location,destination_location,base_fare,distance_fare,time_fare,surge_multiplier,extra_fees,
    passenger_total,captain_gross,platform_commission,captain_net,pricing_version
  ) values (
    v_id,p_pickup_address,p_pickup_lat,p_pickup_lng,p_dropoff_address,p_dropoff_lat,p_dropoff_lng,p_ride_type,
    q.passenger_total,p_distance_km,p_duration_minutes,p_payment_method,v_status,p_scheduled_at,
    jsonb_build_object('lat',p_pickup_lat,'lng',p_pickup_lng,'address',p_pickup_address),
    jsonb_build_object('lat',p_dropoff_lat,'lng',p_dropoff_lng,'address',p_dropoff_address),
    q.base_fare,q.distance_fare,q.time_fare,q.surge_multiplier,q.extra_fees,
    q.passenger_total,q.captain_gross,q.platform_commission,q.captain_net,q.pricing_version
  ) returning * into r;

  insert into public.ride_fares(ride_id,pickup_location,destination_location,distance_km,duration_minutes,base_fare,distance_fare,time_fare,surge_multiplier,extra_fees,passenger_total,captain_gross,platform_commission,captain_net,pricing_version)
  values (r.id,r.pickup_location,r.destination_location,p_distance_km,p_duration_minutes,q.base_fare,q.distance_fare,q.time_fare,q.surge_multiplier,q.extra_fees,q.passenger_total,q.captain_gross,q.platform_commission,q.captain_net,q.pricing_version);
  return r;
end;
$$;

-- Admin-only access to configuration tables.
alter table public.pricing_settings enable row level security;
alter table public.pricing_zones enable row level security;
alter table public.surge_rules enable row level security;
alter table public.pricing_vehicle_rules enable row level security;
alter table public.pricing_versions enable row level security;
alter table public.ride_fares enable row level security;

drop policy if exists "pricing settings admin" on public.pricing_settings;
create policy "pricing settings admin" on public.pricing_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "pricing zones admin" on public.pricing_zones;
create policy "pricing zones admin" on public.pricing_zones for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "surge rules admin" on public.surge_rules;
create policy "surge rules admin" on public.surge_rules for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "vehicle pricing rules admin" on public.pricing_vehicle_rules;
create policy "vehicle pricing rules admin" on public.pricing_vehicle_rules for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "pricing versions admin" on public.pricing_versions;
create policy "pricing versions admin" on public.pricing_versions for select using (public.is_admin());
drop policy if exists "ride fares owner or admin" on public.ride_fares;
create policy "ride fares owner or admin" on public.ride_fares for select using (exists (select 1 from public.rides r where r.id=ride_id and (r.rider_id=auth.uid() or r.driver_id=public.current_driver_id())) or public.is_admin());

grant execute on function public.pricing_quote(double precision,double precision,double precision,double precision,numeric,integer,text,integer,timestamptz) to authenticated;
grant execute on function public.create_ride_priced(double precision,double precision,double precision,double precision,text,text,text,numeric,integer,text,timestamptz) to authenticated;

commit;
