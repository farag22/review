-- Sahil Drive — Dedicated captain cancellation permission fix
-- Run after captain-trip-status-hardening.sql.
-- The captain may cancel only an assigned active ride; no sensitive fields
-- on rides or drivers are writable through this function.

begin;

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

revoke execute on function public.captain_cancel_ride(uuid) from public, anon;
grant execute on function public.captain_cancel_ride(uuid) to authenticated;

commit;
