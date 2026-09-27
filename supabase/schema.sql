-- ============================================================
-- Sahil Drive — قاعدة بيانات الراكب (Supabase / Postgres)
-- شغّل هذا الملف في SQL Editor في مشروع Supabase الخاص بك
-- ============================================================

-- جدول البروفايل (يمتد من auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text unique,
  avatar_url text,
  created_at timestamptz default now()
);

-- الأماكن المحفوظة (المنزل، العمل، مفضلة)
create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  label text not null,          -- 'home' | 'work' | 'favorite'
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

-- المحفظة
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(10,2) not null default 0,
  updated_at timestamptz default now()
);

-- طرق الدفع
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,           -- 'cash' | 'bank' | 'card' | 'wallet'
  label text,
  last4 text,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- السائقين (نسخة مبسطة، للربط مع تطبيق السائق لاحقًا)
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  phone text,
  car_model text,
  plate_number text,
  rating numeric(2,1) default 5.0,
  is_online boolean default false,
  lat double precision,
  lng double precision,
  created_at timestamptz default now()
);

-- الرحلات
create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references public.profiles(id) on delete cascade,
  driver_id uuid references public.drivers(id),
  pickup_address text,
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_address text,
  dropoff_lat double precision,
  dropoff_lng double precision,
  ride_type text,               -- 'comfort' | 'masseya' | 'scooter' | 'tuktuk' | 'economy'
  fare numeric(10,2),
  payment_method text default 'cash',
  status text default 'requested', -- requested | accepted | arriving | in_progress | completed | cancelled
  scheduled_at timestamptz,     -- للرحلات المجدولة
  rider_rating int,
  driver_rating int,
  requested_at timestamptz default now(),
  completed_at timestamptz
);

-- توقفات إضافية لكل رحلة
create table if not exists public.ride_stops (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid references public.rides(id) on delete cascade,
  label text,
  lat double precision,
  lng double precision,
  wait_minutes int default 10,
  stop_order int default 1
);

-- أكواد الخصم
create table if not exists public.promo_codes (
  code text primary key,
  discount_percent int,
  active boolean default true,
  expires_at timestamptz
);

-- ============================================================
-- إنشاء بروفايل ومحفظة تلقائيًا عند تسجيل مستخدم جديد
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Row Level Security: كل راكب يشوف بياناته هو فقط
-- ============================================================
alter table public.profiles enable row level security;
alter table public.saved_places enable row level security;
alter table public.wallets enable row level security;
alter table public.payment_methods enable row level security;
alter table public.rides enable row level security;
alter table public.ride_stops enable row level security;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "manage own saved places" on public.saved_places
  for all using (auth.uid() = user_id);

create policy "read own wallet" on public.wallets
  for select using (auth.uid() = user_id);

create policy "manage own payment methods" on public.payment_methods
  for all using (auth.uid() = user_id);

create policy "manage own rides" on public.rides
  for all using (auth.uid() = rider_id);

create policy "manage own ride stops" on public.ride_stops
  for all using (
    exists (
      select 1 from public.rides r
      where r.id = ride_stops.ride_id and r.rider_id = auth.uid()
    )
  );
