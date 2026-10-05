-- ============================================================
-- Sahil Drive — إصلاح تحديث الرحلة للراكب والكابتن
-- شغّل هذا الملف في SQL Editor
-- ============================================================

begin;

create or replace function public.current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
  from public.drivers d
  where d.user_id = auth.uid()
  limit 1;
$$;

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

-- التسوية الداخلية يجب أن تتجاوز تريغر الحقول الحساسة.
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

  perform set_config('app.internal_driver_update', 'true', true);

  update public.drivers
  set debt = round(greatest(coalesce(debt, 0) + coalesce(p_delta, 0), 0), 2)
  where id = p_driver_id;

  return public.sync_captain_lock(p_driver_id);
end;
$$;

create or replace function public.prevent_driver_sensitive_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.internal_driver_update', true), 'false') = 'true' then
    return new;
  end if;

  if auth.uid() is not null
     and auth.uid() = old.user_id
     and not public.is_admin() then
    if new.debt is distinct from old.debt
       or new.locked is distinct from old.locked
       or new.locked_at is distinct from old.locked_at then
      raise exception 'لا يمكن للكابتن تعديل الحقول الحساسة';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_driver_sensitive_field_changes on public.drivers;
create trigger trg_prevent_driver_sensitive_field_changes
before update on public.drivers
for each row execute function public.prevent_driver_sensitive_field_changes();

create or replace function public.rider_start_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول لبدء الرحلة';
  end if;

  select * into v_ride
  from public.rides
  where id = p_ride_id
    and rider_id = auth.uid()
  for update;

  if not found then
    raise exception 'الرحلة غير موجودة أو لا يمكن تعديلها';
  end if;

  if v_ride.status = 'in_progress' then
    return v_ride;
  end if;

  if v_ride.status not in ('accepted', 'arriving', 'arrived') then
    raise exception 'لا يمكن بدء الرحلة في حالتها الحالية';
  end if;

  update public.rides
  set status = 'in_progress',
      started_at = coalesce(started_at, now())
  where id = p_ride_id
  returning * into v_ride;

  return v_ride;
end;
$$;

create or replace function public.rider_complete_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول لإنهاء الرحلة';
  end if;

  select * into v_ride
  from public.rides
  where id = p_ride_id
    and rider_id = auth.uid()
  for update;

  if not found then
    raise exception 'الرحلة غير موجودة أو لا يمكن تعديلها';
  end if;

  if v_ride.status = 'completed' then
    return v_ride;
  end if;

  if v_ride.status not in ('accepted', 'arriving', 'arrived', 'in_progress') then
    raise exception 'لا يمكن إنهاء الرحلة في حالتها الحالية';
  end if;

  perform set_config('app.internal_driver_update', 'true', true);

  update public.rides
  set status = 'completed',
      completed_at = coalesce(completed_at, now())
  where id = p_ride_id
  returning * into v_ride;

  return v_ride;
end;
$$;

create or replace function public.rider_rate_ride(p_ride_id uuid, p_rating int)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول لتقييم الرحلة';
  end if;

  perform set_config('app.internal_driver_update', 'true', true);

  update public.rides
  set rider_rating = greatest(0, least(5, coalesce(p_rating, 0))),
      status = case
        when status in ('accepted', 'arriving', 'arrived', 'in_progress') then 'completed'
        else status
      end,
      completed_at = case
        when status in ('accepted', 'arriving', 'arrived', 'in_progress') then coalesce(completed_at, now())
        else completed_at
      end
  where id = p_ride_id
    and rider_id = auth.uid()
    and status in ('completed', 'in_progress', 'arrived', 'accepted', 'arriving')
  returning * into v_ride;

  if not found then
    raise exception 'الرحلة غير موجودة أو لا يمكن تعديلها';
  end if;

  return v_ride;
end;
$$;

create or replace function public.captain_update_ride_status(
  p_ride_id uuid,
  p_status text
)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid := public.current_driver_id();
  v_old_status text;
  v_ride public.rides;
begin
  if auth.uid() is null or v_driver_id is null then
    raise exception 'يجب تسجيل الدخول بحساب كابتن معتمد';
  end if;

  if p_status not in ('arrived', 'in_progress', 'completed', 'cancelled') then
    raise exception 'حالة الرحلة غير مسموحة';
  end if;

  select r.status into v_old_status
  from public.rides r
  where r.id = p_ride_id
    and r.driver_id = v_driver_id
  for update;

  if v_old_status is null then
    raise exception 'الرحلة غير موجودة أو غير مرتبطة بهذا الكابتن';
  end if;

  if v_old_status is not distinct from p_status then
    select * into v_ride from public.rides where id = p_ride_id;
    return v_ride;
  end if;

  if p_status = 'arrived' and v_old_status not in ('accepted', 'arriving') then
    raise exception 'لا يمكن الانتقال إلى حالة الوصول الآن';
  end if;
  if p_status = 'in_progress' and v_old_status not in ('arrived', 'arriving', 'accepted') then
    raise exception 'لا يمكن بدء الرحلة قبل الوصول';
  end if;
  if p_status = 'completed' and v_old_status not in ('in_progress', 'arrived', 'accepted') then
    raise exception 'لا يمكن إنهاء رحلة لم تبدأ';
  end if;
  if p_status = 'cancelled' and v_old_status not in ('accepted', 'arriving', 'arrived', 'in_progress') then
    raise exception 'لا يمكن إلغاء الرحلة في حالتها الحالية';
  end if;

  perform set_config('app.internal_driver_update', 'true', true);

  update public.rides
  set status = p_status,
      arrived_at = case
        when p_status = 'arrived' then coalesce(arrived_at, now())
        else arrived_at
      end,
      started_at = case
        when p_status = 'in_progress' then coalesce(started_at, now())
        else started_at
      end,
      completed_at = case
        when p_status = 'completed' then coalesce(completed_at, now())
        else completed_at
      end
  where id = p_ride_id
    and driver_id = v_driver_id;

  select * into v_ride from public.rides where id = p_ride_id;
  return v_ride;
end;
$$;

create or replace function public.accept_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver public.drivers;
  v_ride public.rides;
begin
  if auth.uid() is null then
    raise exception 'سجّل الدخول أولاً';
  end if;

  select * into v_driver
  from public.drivers
  where user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'لا يوجد حساب كابتن';
  end if;

  if coalesce(v_driver.locked, false) or coalesce(v_driver.debt, 0) >= 300 then
    raise exception 'الحساب مقفول بسبب مديونية تجاوزت 300 ج.م. يرجى السداد عبر فودافون كاش';
  end if;

  if v_driver.is_online is not true then
    raise exception 'اتصل أولاً لقبول الطلبات';
  end if;

  update public.rides
  set
    driver_id = v_driver.id,
    status = 'accepted',
    accepted_at = coalesce(accepted_at, now())
  where id = p_ride_id
    and status = 'requested'
    and driver_id is null
    and (v_driver.ride_type is null or ride_type is null or ride_type = v_driver.ride_type)
  returning * into v_ride;

  if not found then
    raise exception 'تم قبول الطلب من كابتن آخر';
  end if;

  return v_ride;
end;
$$;

create or replace function public.rider_cancel_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول لإلغاء الرحلة';
  end if;

  update public.rides
  set status = 'cancelled'
  where id = p_ride_id
    and rider_id = auth.uid()
    and status in ('requested', 'accepted', 'arriving', 'arrived', 'in_progress')
  returning * into v_ride;

  if not found then
    raise exception 'لا يمكن إلغاء الرحلة في حالتها الحالية';
  end if;

  return v_ride;
end;
$$;

create or replace function public.captain_cancel_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid := public.current_driver_id();
  v_ride public.rides;
begin
  if auth.uid() is null or v_driver_id is null then
    raise exception 'يجب تسجيل الدخول بحساب كابتن معتمد';
  end if;

  update public.rides
  set status = 'cancelled'
  where id = p_ride_id
    and driver_id = v_driver_id
    and status in ('accepted', 'arriving', 'arrived', 'in_progress')
  returning * into v_ride;

  if not found then
    raise exception 'لا يمكن إلغاء الرحلة في حالتها الحالية';
  end if;

  return v_ride;
end;
$$;

revoke execute on function public.rider_start_ride(uuid) from public, anon;
revoke execute on function public.rider_complete_ride(uuid) from public, anon;
revoke execute on function public.rider_rate_ride(uuid, int) from public, anon;
revoke execute on function public.captain_update_ride_status(uuid, text) from public, anon;
revoke execute on function public.accept_ride(uuid) from public, anon;
revoke execute on function public.rider_cancel_ride(uuid) from public, anon;
revoke execute on function public.captain_cancel_ride(uuid) from public, anon;

grant execute on function public.current_driver_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.sync_captain_lock(uuid) to authenticated;
grant execute on function public.apply_captain_debt(uuid, numeric) to authenticated;
grant execute on function public.rider_start_ride(uuid) to authenticated;
grant execute on function public.rider_complete_ride(uuid) to authenticated;
grant execute on function public.rider_rate_ride(uuid, int) to authenticated;
grant execute on function public.captain_update_ride_status(uuid, text) to authenticated;
grant execute on function public.accept_ride(uuid) to authenticated;
grant execute on function public.rider_cancel_ride(uuid) to authenticated;
grant execute on function public.captain_cancel_ride(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
