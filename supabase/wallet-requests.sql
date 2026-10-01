-- ============================================================
-- Sahil Drive — طلبات شحن المحفظة بموافقة الإدارة
-- شغّل هذا الملف في SQL Editor بعد schema.sql / admin.sql
-- ============================================================

create table if not exists public.wallet_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  phone_number text,
  receipt_image_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  kind text not null default 'topup' check (kind in ('topup', 'debt_pay')),
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists wallet_requests_status_idx on public.wallet_requests (status, created_at desc);
create index if not exists wallet_requests_user_idx on public.wallet_requests (user_id, created_at desc);

alter table public.wallet_requests enable row level security;

drop policy if exists "riders insert own wallet requests" on public.wallet_requests;
create policy "riders insert own wallet requests" on public.wallet_requests
  for insert with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "riders read own wallet requests" on public.wallet_requests;
create policy "riders read own wallet requests" on public.wallet_requests
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "admins manage wallet requests" on public.wallet_requests;
create policy "admins manage wallet requests" on public.wallet_requests
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "update own wallet" on public.wallets;
drop policy if exists "admins update wallets" on public.wallets;
create policy "admins update wallets" on public.wallets
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins insert wallets" on public.wallets;
create policy "admins insert wallets" on public.wallets
  for insert with check (public.is_admin());

drop policy if exists "admins insert wallet txns" on public.wallet_txns;
create policy "admins insert wallet txns" on public.wallet_txns
  for insert with check (public.is_admin());

-- ملاحظة: دالة مراجعة الطلبات review_wallet_request (بما فيها سداد المديونية)
-- تُعرّف في supabase/fix-settlement.sql كمصدر واحد للحقيقة.
-- شغّل fix-settlement.sql بعد هذا الملف. لا تُعِد تعريف الدالة هنا.

insert into storage.buckets (id, name, public)
values ('wallet-receipts', 'wallet-receipts', true)
on conflict (id) do nothing;

drop policy if exists "riders upload wallet receipts" on storage.objects;
create policy "riders upload wallet receipts" on storage.objects
  for insert with check (
    bucket_id = 'wallet-receipts'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "public read wallet receipts" on storage.objects;
create policy "public read wallet receipts" on storage.objects
  for select using (bucket_id = 'wallet-receipts');

drop policy if exists "admins read wallet receipts" on storage.objects;
create policy "admins read wallet receipts" on storage.objects
  for select using (bucket_id = 'wallet-receipts' and public.is_admin());
