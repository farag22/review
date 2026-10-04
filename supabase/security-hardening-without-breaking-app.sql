-- Sahil Drive — محافظ أمان بدون حذف بيانات أو كسر تدفق التطبيق
-- Applied to Supabase project: sahil-drive-qalyubia

begin;

alter table if exists public.app_migrations enable row level security;
revoke execute on all functions in schema public from anon;

drop policy if exists "Enable all access on drivers for everyone" on public.drivers;
drop policy if exists "Enable public access on profiles" on public.profiles;
drop policy if exists "Users update own wallet" on public.wallets;
drop policy if exists "Users manage own wallet requests" on public.wallet_requests;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.role is distinct from old.role
     and old.role is distinct from 'admin'
     and coalesce(auth.jwt() ->> 'email','') <> 'farag20014@gmail.com' then
    raise exception 'لا يمكن للمستخدم تغيير صلاحية الحساب';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_profile_role_escalation on public.profiles;
create trigger trg_prevent_profile_role_escalation
before update of role on public.profiles
for each row execute function public.prevent_profile_role_escalation();

create or replace function public.prevent_driver_sensitive_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and auth.uid() = old.user_id
     and not public.is_admin() then
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

alter function public.handle_new_user() set search_path = public;
alter function public.create_ride_secure(uuid, double precision, double precision, double precision, double precision, text) set search_path = public;
alter function public.get_nearest_available_drivers(double precision, double precision, text, double precision) set search_path = public;

commit;
