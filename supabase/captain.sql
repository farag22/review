-- ============================================================
-- Sahil Drive — ترقية قاعدة البيانات لواجهة الكابتن
-- شغّل هذا الملف في SQL Editor إن كان schema.sql قد نُفّذ سابقًا
-- ============================================================

alter table public.drivers add column if not exists user_id uuid;
alter table public.rides add column if not exists arrived_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'drivers_user_id_key'
  ) then
    alter table public.drivers add constraint drivers_user_id_key unique (user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'drivers_user_id_fkey'
  ) then
    alter table public.drivers
      add constraint drivers_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;

drop trigger if exists trg_assign_driver on public.rides;

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

drop policy if exists "captains insert self" on public.drivers;
create policy "captains insert self" on public.drivers
  for insert with check (auth.uid() = user_id);

drop policy if exists "captains update self" on public.drivers;
create policy "captains update self" on public.drivers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "captains delete self" on public.drivers;
create policy "captains delete self" on public.drivers
  for delete using (auth.uid() = user_id);

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
