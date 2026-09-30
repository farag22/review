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
