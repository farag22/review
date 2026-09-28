-- ============================================================
-- Sahil Drive — لوحة الإدارة
-- شغّل هذا الملف في SQL Editor بعد schema.sql / captain.sql
-- ============================================================

alter table public.profiles add column if not exists role text default 'rider';

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

-- عيّن حسابك أدمن بعد التسجيل (بدّل الإيميل):
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'admin@example.com');
