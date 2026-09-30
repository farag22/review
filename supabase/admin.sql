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

-- عيّن حساب أدمن (بدّل الإيميل). ينشئ صف profiles إن لم يوجد:
-- insert into public.profiles (id, full_name, role)
-- select id, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 'admin'
-- from auth.users
-- where lower(email) = lower('Farag20014@gmail.com')
-- on conflict (id) do update set role = excluded.role;
--
-- update auth.users
-- set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- where lower(email) = lower('Farag20014@gmail.com');
