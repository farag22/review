-- Sahil Drive — Complete ride from either side and synchronize both clients
-- Run after captain-debt.sql, fix-settlement.sql and security-hardening-without-breaking-app.sql.

begin;

-- Internal debt/lock updates made by settlement must not be rejected as captain edits.
create or replace function public.prevent_driver_sensitive_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and auth.uid() = old.user_id
     and not public.is_admin()
     and coalesce(current_setting('app.internal_driver_update', true), 'false') <> 'true' then
    if new.debt is distinct from old.debt
       or new.locked is distinct from old.locked
       or new.locked_at is distinct from old.locked_at
       or new.status is distinct from old.status
       or new.license_number is distinct from old.license_number
       or new.vehicle_type is distinct from old.vehicle_type then
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

-- A rider may finish only their own assigned active ride. The function changes
-- status/completed_at only; the existing settlement trigger runs once and the
-- realtime UPDATE is received by the captain client.
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

  update public.rides
  set status = 'completed', completed_at = coalesce(completed_at, now())
  where id = p_ride_id
    and rider_id = auth.uid()
    and status in ('accepted', 'arriving', 'arrived', 'in_progress')
  returning * into v_ride;

  if not found then
    raise exception 'لا يمكن إنهاء الرحلة في حالتها الحالية';
  end if;

  return v_ride;
end;
$$;

revoke execute on function public.rider_complete_ride(uuid) from public, anon;
grant execute on function public.rider_complete_ride(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
