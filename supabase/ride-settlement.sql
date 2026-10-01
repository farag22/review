-- ============================================================
-- Sahil Drive — تسوية مالية حقيقية للرحلات (محفظة / نقدًا)
-- شغّل هذا الملف في SQL Editor بعد wallet-requests.sql
-- ============================================================

alter table public.rides add column if not exists settled_at timestamptz;
alter table public.rides add column if not exists app_commission numeric(10,2);
alter table public.rides add column if not exists captain_net numeric(10,2);

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

-- ملاحظة: دالة تسوية الرحلات settle_completed_ride ومنطق مديونية الكابتن
-- انتقلا إلى supabase/fix-settlement.sql (مصدر واحد للحقيقة).
-- شغّل fix-settlement.sql بعد هذا الملف. لا تُعِد تعريف التسوية هنا.

grant execute on function public.held_wallet_fare(uuid, uuid) to authenticated;
grant execute on function public.assert_wallet_can_pay(uuid, numeric, uuid) to authenticated;
