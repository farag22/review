-- Sahil Drive — Captain trip status hardening
-- Allows an assigned authenticated captain to transition only the trip status.
-- Financial settlement remains handled by the existing database trigger.

begin;

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

  if p_status = 'arrived' and v_old_status <> 'accepted' then
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
      completed_at = case when p_status = 'completed' then now() else completed_at end
  where id = p_ride_id
    and driver_id = v_driver_id;

  -- AFTER triggers may settle the ride; return the final row after they finish.
  select * into v_ride from public.rides where id = p_ride_id;
  return v_ride;
end;
$$;

revoke execute on function public.captain_update_ride_status(uuid, text) from anon;
grant execute on function public.captain_update_ride_status(uuid, text) to authenticated;

-- Keep a narrowly-scoped RLS policy for terminal transitions.
drop policy if exists "captains update terminal ride status" on public.rides;
create policy "captains update terminal ride status" on public.rides
for update to authenticated
using (
  driver_id = public.current_driver_id()
  and status in ('accepted', 'arriving', 'arrived', 'in_progress')
)
with check (
  driver_id = public.current_driver_id()
  and status in ('completed', 'cancelled')
);

-- If a client attempts to finish/cancel directly while changing fare, driver,
-- rider, or any other field, reject it. The RPC above changes only status and
-- completed_at, while existing acceptance/status flows remain supported.
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
       (to_jsonb(new) - 'status' - 'completed_at')
       is distinct from
       (to_jsonb(old) - 'status' - 'completed_at')
     ) then
    raise exception 'يمكن للكابتن تحديث حالة الرحلة فقط';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_captain_terminal_field_tampering on public.rides;
create trigger trg_prevent_captain_terminal_field_tampering
before update on public.rides
for each row execute function public.prevent_captain_terminal_field_tampering();

commit;
