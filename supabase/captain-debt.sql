-- ============================================================
-- Sahil Drive — مديونية الكابتن (حد 300 ج.م) وسداد فودافون كاش
--
-- تنبيه: تسوية الرحلات (settle_completed_ride) ومراجعة الطلبات
-- (review_wallet_request) انتقلتا إلى supabase/fix-settlement.sql
-- كمصدر واحد للحقيقة. شغّل fix-settlement.sql بعد هذا الملف.
--
-- يحتفظ هذا الملف بأعمدة المديونية ودوالها المساعدة للتوافق الخلفي.
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

  -- Trusted server-side settlement update; do not treat it as captain editing.
  perform set_config('app.internal_driver_update', 'true', true);

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

grant execute on function public.sync_captain_lock(uuid) to authenticated;
grant execute on function public.apply_captain_debt(uuid, numeric) to authenticated;

-- إعادة تحميل مخطط PostgREST حتى تظهر أعمدة debt / locked / kind فوراً
notify pgrst, 'reload schema';
