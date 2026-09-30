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
