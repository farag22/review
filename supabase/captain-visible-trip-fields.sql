-- Sahil Drive — allow captains to update visible operational ride fields
-- Identity, ownership, payment and rider fields remain protected.

begin;

alter table public.rides add column if not exists distance_km numeric(10,2);
alter table public.rides add column if not exists duration_min integer;

create or replace function public.prevent_captain_terminal_field_tampering()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and old.driver_id = public.current_driver_id()
     and old.status in ('accepted', 'arriving', 'arrived', 'in_progress')
     and new.status in ('completed', 'cancelled')
     and (
       (to_jsonb(new)
        - 'status'
        - 'completed_at'
        - 'arrived_at'
        - 'started_at'
        - 'distance_km'
        - 'duration_min'
        - 'fare'
        - 'commission_amount'
        - 'captain_earnings'
        - 'app_commission'
        - 'captain_net'
        - 'settled_at')
       is distinct from
       (to_jsonb(old)
        - 'status'
        - 'completed_at'
        - 'arrived_at'
        - 'started_at'
        - 'distance_km'
        - 'duration_min'
        - 'fare'
        - 'commission_amount'
        - 'captain_earnings'
        - 'app_commission'
        - 'captain_net'
        - 'settled_at')
     ) then
    raise exception 'لا يمكن للكابتن تعديل بيانات الراكب أو ملكية الرحلة';
  end if;
  return new;
end;
$$;

create or replace function public.captain_update_ride_progress(
  p_ride_id uuid,
  p_status text,
  p_distance_km numeric default null,
  p_duration_min integer default null,
  p_fare numeric default null
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
  where r.id = p_ride_id and r.driver_id = v_driver_id
  for update;

  if v_old_status is null then
    raise exception 'الرحلة غير موجودة أو غير مرتبطة بهذا الكابتن';
  end if;
  if p_status = 'arrived' and v_old_status not in ('accepted', 'arriving') then
    raise exception 'لا يمكن الانتقال إلى حالة الوصول الآن';
  end if;
  if p_status = 'in_progress' and v_old_status not in ('arrived', 'arriving') then
    raise exception 'لا يمكن بدء الرحلة قبل الوصول';
  end if;
  if p_status = 'completed' and v_old_status <> 'in_progress' then
    raise exception 'لا يمكن إنهاء رحلة لم تبدأ';
  end if;
  if p_status = 'cancelled' and v_old_status not in ('accepted', 'arriving', 'arrived', 'in_progress') then
    raise exception 'لا يمكن إلغاء الرحلة في حالتها الحالية';
  end if;

  update public.rides
  set status = p_status,
      arrived_at = case when p_status = 'arrived' then coalesce(arrived_at, now()) else arrived_at end,
      started_at = case when p_status = 'in_progress' then coalesce(started_at, now()) else started_at end,
      completed_at = case when p_status = 'completed' then now() else completed_at end,
      distance_km = coalesce(p_distance_km, distance_km),
      duration_min = coalesce(p_duration_min, duration_min),
      fare = coalesce(p_fare, fare)
  where id = p_ride_id and driver_id = v_driver_id;

  select * into v_ride from public.rides where id = p_ride_id;
  return v_ride;
end;
$$;

revoke execute on function public.captain_update_ride_progress(uuid, text, numeric, integer, numeric) from public, anon;
grant execute on function public.captain_update_ride_progress(uuid, text, numeric, integer, numeric) to authenticated;

notify pgrst, 'reload schema';
commit;
