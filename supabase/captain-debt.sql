-- ============================================================
-- Sahil Drive — مديونية الكابتن (حد 300 ج.م) وسداد فودافون كاش
-- شغّل هذا الملف في SQL Editor بعد ride-settlement.sql
-- ============================================================

alter table public.drivers add column if not exists debt numeric(10,2) not null default 0;
alter table public.drivers add column if not exists locked boolean not null default false;
alter table public.drivers add column if not exists locked_at timestamptz;

alter table public.wallet_requests add column if not exists kind text not null default 'topup';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'wallet_requests_kind_check'
  ) then
    alter table public.wallet_requests
      add constraint wallet_requests_kind_check
      check (kind in ('topup', 'debt_pay'));
  end if;
end $$;

update public.drivers
set locked = (coalesce(debt, 0) >= 300),
    locked_at = case
      when coalesce(debt, 0) >= 300 then coalesce(locked_at, now())
      else null
    end;

create or replace function public.sync_captain_lock(p_driver_id uuid)
returns public.drivers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver public.drivers;
  v_debt numeric;
begin
  select * into v_driver
  from public.drivers
  where id = p_driver_id
  for update;

  if not found then
    raise exception 'حساب الكابتن غير موجود';
  end if;

  v_debt := round(greatest(coalesce(v_driver.debt, 0), 0), 2);

  update public.drivers
  set debt = v_debt,
      locked = (v_debt >= 300),
      locked_at = case
        when v_debt >= 300 then coalesce(locked_at, now())
        else null
      end,
      is_online = case
        when v_debt >= 300 then false
        else is_online
      end
  where id = p_driver_id
  returning * into v_driver;

  return v_driver;
end;
$$;

create or replace function public.apply_captain_debt(p_driver_id uuid, p_delta numeric)
returns public.drivers
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_driver_id is null then
    raise exception 'حساب الكابتن غير موجود';
  end if;

  update public.drivers
  set debt = round(greatest(coalesce(debt, 0) + coalesce(p_delta, 0), 0), 2)
  where id = p_driver_id;

  return public.sync_captain_lock(p_driver_id);
end;
$$;

create or replace function public.is_online_captain_for(p_ride_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.drivers d
    where d.user_id = auth.uid()
      and d.is_online is true
      and coalesce(d.locked, false) is not true
      and coalesce(d.debt, 0) < 300
      and (d.ride_type is null or p_ride_type is null or d.ride_type = p_ride_type)
  );
$$;

create or replace function public.trg_block_locked_captain_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_debt numeric := 0;
  v_locked boolean := false;
begin
  if new.driver_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' or (old.driver_id is distinct from new.driver_id) then
    select coalesce(d.debt, 0), coalesce(d.locked, false)
    into v_debt, v_locked
    from public.drivers d
    where d.id = new.driver_id;

    if v_locked or v_debt >= 300 then
      raise exception 'الحساب مقفول بسبب مديونية تجاوزت 300 ج.م. يرجى السداد عبر فودافون كاش';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_block_locked_captain_accept on public.rides;
create trigger trg_block_locked_captain_accept
  before insert or update of driver_id
  on public.rides
  for each row
  execute procedure public.trg_block_locked_captain_accept();

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
    if ride.driver_id is not null then
      perform public.apply_captain_debt(ride.driver_id, v_commission);

      if v_captain_user is not null then
        insert into public.wallet_txns (user_id, amount, kind, note)
        values (v_captain_user, v_commission, 'commission', 'عمولة التطبيق 10% أُضيفت لمديونية الكابتن');
      end if;
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

create or replace function public.review_wallet_request(p_request_id uuid, p_approve boolean, p_note text default null)
returns public.wallet_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.wallet_requests;
  v_driver_id uuid;
  v_debt numeric := 0;
  v_paid numeric := 0;
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
    if coalesce(req.kind, 'topup') = 'debt_pay' then
      select d.id, coalesce(d.debt, 0)
      into v_driver_id, v_debt
      from public.drivers d
      where d.user_id = req.user_id
      for update;

      if v_driver_id is null then
        raise exception 'لا يوجد حساب كابتن مرتبط بهذا الطلب';
      end if;

      v_paid := least(req.amount, v_debt);
      perform public.apply_captain_debt(v_driver_id, -v_paid);

      insert into public.wallet_txns (user_id, amount, kind, note)
      values (
        req.user_id,
        v_paid,
        'debt_pay',
        coalesce(p_note, 'سداد مديونية بعد موافقة الإدارة')
      );
    else
      insert into public.wallets (user_id, balance, updated_at)
      values (req.user_id, req.amount, now())
      on conflict (user_id) do update
        set balance = public.wallets.balance + excluded.balance,
            updated_at = now();

      insert into public.wallet_txns (user_id, amount, kind, note)
      values (req.user_id, req.amount, 'topup', coalesce(p_note, 'شحن بعد موافقة الإدارة'));
    end if;

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

grant execute on function public.sync_captain_lock(uuid) to authenticated;
grant execute on function public.apply_captain_debt(uuid, numeric) to authenticated;
grant execute on function public.review_wallet_request(uuid, boolean, text) to authenticated;
