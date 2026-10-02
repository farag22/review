-- =========================================================================
-- ملف الهجرة الموحد: تأمين وقوة النظام (Production Hardening Migration)
-- التاريخ: 2026-10-02
-- =========================================================================

-- 1️⃣ تفعيل سياسات الأمان على مستوى الصف (RLS) للجداول الحساسة
alter table if exists drivers enable row level security;
alter table if exists profiles enable row level security;
alter table if exists rides enable row level security;

-- تنظيف السياسات القديمة إن وجدت لتجنب التكرار
drop policy if exists "Public read online drivers" on drivers;
drop policy if exists "Drivers can update own profile" on drivers;
drop policy if exists "Users can read own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;

-- سياسة قراءة الكباتن المتصلين فقط (لتظهر الخريطة للركاب بأمان)
create policy "Public read online drivers" on drivers
  for select using (is_online = true);

-- سياسة تعديل بيانات السائق لنفسه فقط
create policy "Drivers can update own profile" on drivers
  for update using (auth.uid() = id);

-- سياسات البروفايل الشخصي
create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);


-- =========================================================================
-- 2️⃣ نظام اختيار وتوزيع أقرب كابتن (Haversine Matching Function)
-- =========================================================================
create or replace function get_nearest_available_drivers(
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_ride_type text,
  p_max_distance_km double precision default 15.0
)
returns table (
  id uuid,
  full_name text,
  current_lat double precision,
  current_lng double precision,
  ride_type text,
  distance_km double precision
)
language sql
security definer
as $$
  select 
    d.id,
    d.full_name,
    d.current_lat,
    d.current_lng,
    d.ride_type,
    (
      6371 * acos(
        cos(radians(p_pickup_lat)) * cos(radians(d.current_lat)) *
        cos(radians(d.current_lng) - radians(p_pickup_lng)) +
        sin(radians(p_pickup_lat)) * sin(radians(d.current_lat))
      )
    ) as distance_km
  from drivers d
  where d.is_online = true
    and d.current_lat is not null
    and d.current_lng is not null
    and (p_ride_type is null or d.ride_type = p_ride_type)
    and (
      6371 * acos(
        cos(radians(p_pickup_lat)) * cos(radians(d.current_lat)) *
        cos(radians(d.current_lng) - radians(p_pickup_lng)) +
        sin(radians(p_pickup_lat)) * sin(radians(d.current_lat))
      )
    ) <= p_max_distance_km
  order by distance_km asc
  limit 5;
$$;


-- =========================================================================
-- 3️⃣ دالة إنشاء الرحلة وحساب السعر من جهة الخادم (Server-side Pricing)
-- =========================================================================
create or replace function create_ride_secure(
  p_rider_id uuid,
  p_pickup_lat double precision,
  p_pickup_lng double precision,
  p_dropoff_lat double precision,
  p_dropoff_lng double precision,
  p_ride_type text
)
returns json
language plpgsql
security definer
as $$
declare
  v_distance_km double precision;
  v_base_fare double precision := 15.0;
  v_km_rate double precision := 5.0;
  v_total_fare double precision;
  v_ride_id uuid;
begin
  -- حساب المسافة الحقيقية بالـ Haversine من داخل الخادم لمنع التلاعب
  v_distance_km := 6371 * acos(
    cos(radians(p_pickup_lat)) * cos(radians(p_dropoff_lat)) *
    cos(radians(p_dropoff_lng) - radians(p_pickup_lng)) +
    sin(radians(p_pickup_lat)) * sin(radians(p_dropoff_lat))
  );

  -- حساب الأجرة بقواعد النظام الأساسية
  v_total_fare := greatest(v_base_fare, round((v_base_fare + (v_distance_km * v_km_rate))::numeric, 2));

  -- إدخال الرحلة في الجدول بأمان تام
  insert into rides (rider_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, ride_type, distance_km, fare, status)
  values (p_rider_id, p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng, p_ride_type, v_distance_km, v_total_fare, 'pending')
  returning id into v_ride_id;

  return json_build_object(
    'ride_id', v_ride_id, 
    'fare', v_total_fare, 
    'distance_km', round(v_distance_km::numeric, 2)
  );
end;
$$;


-- =========================================================================
-- 4️⃣ دالة تحديث موقع الكابتن وتشفير المراقبة (Secure Location Update)
-- =========================================================================
create or replace function update_driver_location(
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision,
  p_heading double precision,
  p_speed double precision
)
returns void
language plpgsql
security definer
as $$
begin
  update drivers
  set 
    current_lat = p_lat,
    current_lng = p_lng,
    heading = p_heading,
    updated_at = now()
  where id = auth.uid();
end;
$$;
