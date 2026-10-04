-- Sahil Drive — Canonical rides table + captain terminal status RLS
-- Idempotent migration. The app uses public.rides as its single source of truth.

begin;

create extension if not exists pgcrypto;

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
  payment_method text not null default 'cash',
  status text not null default 'requested',
  scheduled_at timestamptz,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  rider_rating integer,
  driver_rating integer,
  commission_amount numeric(10,2) not null default 0,
  captain_earnings numeric(10,2) not null default 0,
  settled_at timestamptz,
  app_commission numeric(10,2),
  captain_net numeric(10,2)
);

alter table public.rides add column if not exists arrived_at timestamptz;
alter table public.rides add column if not exists settled_at timestamptz;
alter table public.rides add column if not exists app_commission numeric(10,2);
alter table public.rides add column if not exists captain_net numeric(10,2);

alter table public.rides enable row level security;

-- Remove legacy public policies that overlap and can produce permissive or
-- contradictory RLS behavior.
drop policy if exists rides_insert_policy on public.rides;
drop policy if exists rides_select_policy on public.rides;
drop policy if exists rides_update_policy on public.rides;
drop policy if exists "manage own rides" on public.rides;
drop policy if exists "riders manage own rides" on public.rides;
drop policy if exists "captains update assigned rides" on public.rides;
drop policy if exists "captains update terminal ride status" on public.rides;
drop policy if exists "captains accept requested rides" on public.rides;
drop policy if exists "captains accept and update rides" on public.rides;
drop policy if exists "admins manage rides" on public.rides;

-- Rider read/creation access.
create policy "rides rider select own"
on public.rides for select to authenticated
using (rider_id = auth.uid());

create policy "rides rider insert own"
on public.rides for insert to authenticated
with check (rider_id = auth.uid());

-- The rider may start an accepted/arrived ride from ConfirmPickup. Completion
-- and cancellation use dedicated RPCs so their transitions are server-owned.
create policy "rides rider start assigned"
on public.rides for update to authenticated
using (
  rider_id = auth.uid()
  and status in ('accepted', 'arriving', 'arrived')
)
with check (
  rider_id = auth.uid()
  and status = 'in_progress'
);

-- Captain can see only assigned rides and eligible open requests.
create policy "rides captain select assigned"
on public.rides for select to authenticated
using (driver_id is not null and driver_id = public.current_driver_id());

create policy "rides captain select requested"
on public.rides for select to authenticated
using (
  status = 'requested'
  and driver_id is null
  and public.is_online_captain_for(ride_type)
);

-- Captain acceptance: claim an unassigned request without changing ownership.
create policy "rides captain accept requested"
on public.rides for update to authenticated
using (
  status = 'requested'
  and driver_id is null
  and public.is_online_captain_for(ride_type)
)
with check (driver_id = public.current_driver_id());

-- Captain terminal transition: only the assigned captain can move an active
-- ride to completed/cancelled. The terminal-field trigger prevents changing
-- fare, rider, driver, or other sensitive columns in the same update.
create policy "rides captain update terminal status"
on public.rides for update to authenticated
using (
  driver_id = public.current_driver_id()
  and status in ('accepted', 'arriving', 'arrived', 'in_progress')
)
with check (
  driver_id = public.current_driver_id()
  and status in ('completed', 'cancelled')
);

create policy "rides admin manage"
on public.rides for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists rides_rider_status_idx
  on public.rides (rider_id, status, requested_at desc);
create index if not exists rides_driver_status_idx
  on public.rides (driver_id, status, requested_at desc);
create index if not exists rides_requested_type_idx
  on public.rides (ride_type, requested_at desc)
  where status = 'requested' and driver_id is null;

notify pgrst, 'reload schema';
commit;
