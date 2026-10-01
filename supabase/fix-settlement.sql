-- ============================================================
-- Sahil Drive — الإصلاح الموحّد للتسوية والمديونية
-- ملف واحد قابل لإعادة التشغيل بأمان (Idempotent) — لا يضرّ بتكراره.
--
-- شغّله في SQL Editor كخيار أخير بعد: schema.sql / captain.sql /
-- admin.sql / wallet-requests.sql / captain-debt.sql
--
-- لماذا هذا الملف؟
--   كانت دالة settle_completed_ride مكرّرة بنسخة قديمة تخصم عمولة
--   الرحلات النقدية من محفظة الكابتن بدل إضافتها للمديونية. إعادة
--   تشغيل schema.sql أو ride-settlement.sql كانت تلغي منطق المديونية.
--   الآن أصبحت النسخة الصحيحة في هذا الملف فقط (مصدر واحد للحقيقة).
--
-- ماذا يفعل؟
--   1) يثبّت الأعمدة والقيود الناقصة.
--   2) يعيد تعريف دوال التسوية والمراجعة بالنسخة الصحيحة (مديونية).
--   3) يسوّي الرحلات المكتملة غير المسوّاة (رحلات قديمة).
--   4) يعكس العمولات القديمة التي خُصمت خطأً من محفظة الكابتن (مرة واحدة).
--   5) يعيد حساب مديونية كل كابتن من رحلاته النقدية الفعلية.
--
-- ملاحظة: هذا الملف يعتمد على public.is_admin() المعرّفة في schema.sql / admin.sql.
-- ============================================================

-- ------------------------------------------------------------------
-- 1) الأعمدة والقيود الناقصة
-- ------------------------------------------------------------------
alter table public.drivers add column if not exists debt numeric(10,2) not null default 0;
alter table public.drivers add column if not exists locked boolean not null default false;
alter table public.drivers add column if not exists locked_at timestamptz;

alter table public.rides add column if not exists settled_at timestamptz;
alter table public.rides add column if not exists app_commission numeric(10,2);
alter table public.rides add column if not exists captain_net numeric(10,2);

alter table public.wallet_requests add column if not exists kind text not null default 'topup';

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'wallet_requests'
  ) and not exists (
    select 1 from pg_constraint where conname = 'wallet_requests_kind_check'
  ) then
    alter table public.wallet_requests
      add constraint wallet_requests_kind_check
      check (kind in ('topup', 'debt_pay'));
  end if;
end $$;

create table if not exists public.app_migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- 2) الدوال المساعدة (محفظة + مديونية)
-- ------------------------------------------------------------------
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

-- ------------------------------------------------------------------
-- 3) التسوية الموحّدة (مديونية) + مراجعة الطلبات
-- ------------------------------------------------------------------
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

-- ------------------------------------------------------------------
-- 4) ترحيل الرحلات القديمة والبيانات التالفة
-- ------------------------------------------------------------------

-- 4.أ — تسوية الرحلات المكتملة التي لم تُسوَّ بعد
do $$
declare
  r record;
begin
  for r in
    select id from public.rides
    where status = 'completed' and settled_at is null
  loop
    begin
      perform public.settle_completed_ride(r.id);
    exception when others then
      raise notice 'تعذّرت تسوية الرحلة %: %', r.id, sqlerrm;
    end;
  end loop;
end $$;

-- 4.ب — عكس العمولات القديمة التي خُصمت من محفظة الكابتن (مرة واحدة فقط)
do $$
declare
  t record;
begin
  if exists (
    select 1 from public.app_migrations
    where id = 'reverse_legacy_captain_commission'
  ) then
    return;
  end if;

  for t in
    select *
    from public.wallet_txns
    where kind = 'commission'
      and note = 'عمولة التطبيق 10% على رحلة نقدية'
  loop
    update public.wallets
    set balance = balance + t.amount,
        updated_at = now()
    where user_id = t.user_id;

    insert into public.wallet_txns (user_id, amount, kind, note)
    values (t.user_id, -t.amount, 'commission_reversal', 'عكس عمولة كانت مخصومة من المحفظة (أصبحت مديونية على الكابتن)');
  end loop;

  insert into public.app_migrations (id)
  values ('reverse_legacy_captain_commission');
end $$;

-- 4.ج — إعادة حساب المديونية من الرحلات النقدية الفعلية ثم مزامنة القفل.
-- المديونية = مجموع عمولات الرحلات النقدية المكتملة (10%) ناقص ما تم سداده
-- عبر طلبات سداد المديونية المعتمدة. ملاحظة: طلبات سداد قديمة وافقت عليها
-- نسخة الإصلاح القديمة قد تكون أضافت رصيداً للمحفظة بدل خصم المديونية؛
-- راجعها يدوياً إن وُجدت لأن هذه التسوية تفترض أنها خُصمت من المديونية.
update public.drivers d
set debt = round(
      greatest(
        (
          select coalesce(sum(coalesce(r.app_commission, round(coalesce(r.fare, 0) * 0.10, 2))), 0)
          from public.rides r
          where r.driver_id = d.id
            and r.status = 'completed'
            and r.payment_method = 'cash'
        )
        - (
          select coalesce(sum(wr.amount), 0)
          from public.wallet_requests wr
          where wr.user_id = d.user_id
            and wr.kind = 'debt_pay'
            and wr.status = 'approved'
        ),
        0
      ),
      2
    );

do $$
declare
  d record;
begin
  for d in select id from public.drivers loop
    perform public.sync_captain_lock(d.id);
  end loop;
end $$;

-- ------------------------------------------------------------------
-- 5) الصلاحيات + تحديث مخطط PostgREST
-- ------------------------------------------------------------------
grant execute on function public.ensure_wallet(uuid) to authenticated;
grant execute on function public.sync_captain_lock(uuid) to authenticated;
grant execute on function public.apply_captain_debt(uuid, numeric) to authenticated;
grant execute on function public.held_wallet_fare(uuid, uuid) to authenticated;
grant execute on function public.assert_wallet_can_pay(uuid, numeric, uuid) to authenticated;
grant execute on function public.settle_completed_ride(uuid) to authenticated;
grant execute on function public.review_wallet_request(uuid, boolean, text) to authenticated;

notify pgrst, 'reload schema';
